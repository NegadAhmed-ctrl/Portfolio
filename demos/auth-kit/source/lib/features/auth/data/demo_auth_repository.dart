import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';

import '../../../core/storage/key_value_store.dart';
import '../domain/auth_failure.dart';
import '../domain/auth_repository.dart';
import '../domain/auth_user.dart';
import 'demo_outbox.dart';

/// DEMO backend that behaves like a real one, fully offline:
/// salted password hashes, 6-digit codes with expiry, limited attempts,
/// resend cooldown, one-time reset tokens and a persisted session.
///
/// Accounts live in [KeyValueStore] (browser storage on the web demo).
/// Codes are "emailed" to [DemoOutbox] so the demo can show them on screen.
class DemoAuthRepository implements AuthRepository {
  DemoAuthRepository({
    required KeyValueStore store,
    required DemoOutbox outbox,
    DateTime Function()? clock,
    Random? random,
    this.latency = const Duration(milliseconds: 700),
    this.codeTtl = const Duration(minutes: 10),
    this.maxCodeAttempts = 5,
    this.resendCooldown = const Duration(seconds: 30),
  })  : _store = store,
        _outbox = outbox,
        _now = clock ?? DateTime.now,
        _random = random ?? Random.secure();

  static const demoEmail = 'demo@negadbuilds.dev';
  static const demoPassword = 'Demo@1234';
  static const _usersKey = 'auth.users.v1';
  static const _sessionKey = 'auth.session.v1';

  final KeyValueStore _store;
  final DemoOutbox _outbox;
  final DateTime Function() _now;
  final Random _random;
  final Duration latency;
  final Duration codeTtl;
  final int maxCodeAttempts;
  final Duration resendCooldown;

  final _changes = StreamController<AuthUser?>.broadcast();
  final _codes = <String, _PendingCode>{};
  final _resetTokens = <String, _ResetToken>{};
  Map<String, _UserRecord>? _users;
  AuthUser? _current;

  @override
  Stream<AuthUser?> authStateChanges() => _changes.stream;

  @override
  Future<AuthUser?> restoreSession() async {
    final users = await _loadUsers();
    final email = await _store.read(_sessionKey);
    final record = email == null ? null : users[email];
    _current = record?.toUser();
    if (email != null && record == null) await _store.delete(_sessionKey);
    return _current;
  }

  @override
  Future<AuthUser> signIn({required String email, required String password}) async {
    await _simulateNetwork();
    final record = (await _loadUsers())[_normalize(email)];
    // Same error for "no such user" and "wrong password": don't leak which.
    if (record == null || !record.matches(password)) {
      throw const AuthFailure(AuthFailureCode.invalidCredentials);
    }
    return _startSession(record);
  }

  @override
  Future<AuthUser> register({
    required String name,
    required String email,
    required String password,
  }) async {
    await _simulateNetwork();
    final users = await _loadUsers();
    final key = _normalize(email);
    if (users.containsKey(key)) {
      throw const AuthFailure(AuthFailureCode.emailAlreadyInUse);
    }
    final salt = _randomToken(16);
    final record = _UserRecord(
      id: 'u_${_randomToken(8)}',
      name: name.trim(),
      email: key,
      salt: salt,
      passwordHash: _hash(password, salt),
      emailVerified: false,
      createdAt: _now(),
    );
    users[key] = record;
    await _saveUsers();
    _issueCode(key, DemoEmailKind.verifyEmail, enforceCooldown: false);
    return _startSession(record);
  }

  @override
  Future<void> sendEmailVerification() async {
    await _simulateNetwork();
    final user = _requireCurrent();
    _issueCode(user.email, DemoEmailKind.verifyEmail);
  }

  @override
  Future<AuthUser> verifyEmail(String code) async {
    await _simulateNetwork();
    final user = _requireCurrent();
    _consumeCode(user.email, DemoEmailKind.verifyEmail, code);
    final users = await _loadUsers();
    final updated = users[user.email]!.copyWith(emailVerified: true);
    users[user.email] = updated;
    await _saveUsers();
    _current = updated.toUser();
    _changes.add(_current);
    return _current!;
  }

  @override
  Future<void> requestPasswordReset(String email) async {
    await _simulateNetwork();
    final key = _normalize(email);
    if ((await _loadUsers()).containsKey(key)) {
      _issueCode(key, DemoEmailKind.resetPassword);
    }
  }

  @override
  Future<String> verifyResetCode({required String email, required String code}) async {
    await _simulateNetwork();
    final key = _normalize(email);
    _consumeCode(key, DemoEmailKind.resetPassword, code);
    final token = _randomToken(24);
    _resetTokens[token] = _ResetToken(key, _now().add(const Duration(minutes: 15)));
    return token;
  }

  @override
  Future<void> resetPassword({
    required String resetToken,
    required String newPassword,
  }) async {
    await _simulateNetwork();
    final token = _resetTokens.remove(resetToken);
    if (token == null || _now().isAfter(token.expiresAt)) {
      throw const AuthFailure(AuthFailureCode.sessionExpired);
    }
    final users = await _loadUsers();
    final record = users[token.email];
    if (record == null) throw const AuthFailure(AuthFailureCode.sessionExpired);
    final salt = _randomToken(16);
    // A reset proves ownership of the inbox, so the email counts as verified.
    users[token.email] = record.copyWith(
      salt: salt,
      passwordHash: _hash(newPassword, salt),
      emailVerified: true,
    );
    await _saveUsers();
  }

  @override
  Future<void> signOut() async {
    await _store.delete(_sessionKey);
    _current = null;
    _changes.add(null);
  }

  // ---- internals ---------------------------------------------------------

  Future<AuthUser> _startSession(_UserRecord record) async {
    await _store.write(_sessionKey, record.email);
    _current = record.toUser();
    _changes.add(_current);
    return _current!;
  }

  AuthUser _requireCurrent() =>
      _current ?? (throw const AuthFailure(AuthFailureCode.sessionExpired));

  void _issueCode(String email, DemoEmailKind kind, {bool enforceCooldown = true}) {
    final id = '${kind.name}:$email';
    final existing = _codes[id];
    final now = _now();
    if (enforceCooldown && existing != null) {
      final wait = existing.sentAt.add(resendCooldown).difference(now);
      if (wait > Duration.zero) {
        throw AuthFailure(AuthFailureCode.tooManyRequests, retryAfter: wait);
      }
    }
    final code = (_random.nextInt(900000) + 100000).toString();
    _codes[id] = _PendingCode(code, now, now.add(codeTtl), maxCodeAttempts);
    _outbox.deliver(DemoEmail(to: email, kind: kind, code: code, sentAt: now));
  }

  void _consumeCode(String email, DemoEmailKind kind, String code) {
    final id = '${kind.name}:$email';
    final pending = _codes[id];
    if (pending == null) {
      throw const AuthFailure(AuthFailureCode.codeExpired);
    }
    if (pending.burned) {
      throw const AuthFailure(AuthFailureCode.tooManyAttempts);
    }
    if (_now().isAfter(pending.expiresAt)) {
      _codes.remove(id);
      throw const AuthFailure(AuthFailureCode.codeExpired);
    }
    if (pending.code != code.trim()) {
      pending.attemptsLeft--;
      if (pending.attemptsLeft <= 0) {
        // Burn the code but keep sentAt so the cooldown still applies.
        pending.burned = true;
        throw const AuthFailure(AuthFailureCode.tooManyAttempts);
      }
      throw AuthFailure(AuthFailureCode.invalidCode, attemptsLeft: pending.attemptsLeft);
    }
    _codes.remove(id);
  }

  Future<void> _simulateNetwork() async {
    if (latency > Duration.zero) await Future<void>.delayed(latency);
  }

  Future<Map<String, _UserRecord>> _loadUsers() async {
    if (_users != null) return _users!;
    final raw = await _store.read(_usersKey);
    final users = <String, _UserRecord>{};
    if (raw != null) {
      try {
        for (final e in (jsonDecode(raw) as List).cast<Map<String, dynamic>>()) {
          final r = _UserRecord.fromJson(e);
          users[r.email] = r;
        }
      } catch (_) {
        // Corrupted storage: start clean instead of crashing on launch.
      }
    }
    if (!users.containsKey(demoEmail)) {
      const salt = 'demo-salt';
      users[demoEmail] = _UserRecord(
        id: 'u_demo',
        name: 'Sara Ahmed',
        email: demoEmail,
        salt: salt,
        passwordHash: _hash(demoPassword, salt),
        emailVerified: true,
        createdAt: DateTime(2026, 11, 1),
      );
    }
    return _users = users;
  }

  Future<void> _saveUsers() => _store.write(
        _usersKey,
        jsonEncode(_users!.values.map((u) => u.toJson()).toList()),
      );

  static String _normalize(String email) => email.trim().toLowerCase();

  static String _hash(String password, String salt) =>
      sha256.convert(utf8.encode('$salt:$password')).toString();

  String _randomToken(int bytes) => base64Url
      .encode(List<int>.generate(bytes, (_) => _random.nextInt(256)))
      .replaceAll('=', '');
}

class _PendingCode {
  _PendingCode(this.code, this.sentAt, this.expiresAt, this.attemptsLeft);
  final String code;
  final DateTime sentAt;
  final DateTime expiresAt;
  int attemptsLeft;
  bool burned = false;
}

class _ResetToken {
  const _ResetToken(this.email, this.expiresAt);
  final String email;
  final DateTime expiresAt;
}

class _UserRecord {
  const _UserRecord({
    required this.id,
    required this.name,
    required this.email,
    required this.salt,
    required this.passwordHash,
    required this.emailVerified,
    required this.createdAt,
  });

  factory _UserRecord.fromJson(Map<String, dynamic> j) => _UserRecord(
        id: j['id'] as String,
        name: j['name'] as String,
        email: j['email'] as String,
        salt: j['salt'] as String,
        passwordHash: j['hash'] as String,
        emailVerified: j['verified'] as bool,
        createdAt: DateTime.parse(j['createdAt'] as String),
      );

  final String id;
  final String name;
  final String email;
  final String salt;
  final String passwordHash;
  final bool emailVerified;
  final DateTime createdAt;

  bool matches(String password) =>
      DemoAuthRepository._hash(password, salt) == passwordHash;

  _UserRecord copyWith({String? salt, String? passwordHash, bool? emailVerified}) =>
      _UserRecord(
        id: id,
        name: name,
        email: email,
        salt: salt ?? this.salt,
        passwordHash: passwordHash ?? this.passwordHash,
        emailVerified: emailVerified ?? this.emailVerified,
        createdAt: createdAt,
      );

  AuthUser toUser() => AuthUser(
        id: id,
        email: email,
        name: name,
        emailVerified: emailVerified,
        createdAt: createdAt,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'salt': salt,
        'hash': passwordHash,
        'verified': emailVerified,
        'createdAt': createdAt.toIso8601String(),
      };
}
