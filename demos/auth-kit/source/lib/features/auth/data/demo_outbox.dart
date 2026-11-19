import 'package:equatable/equatable.dart';
import 'package:flutter/foundation.dart';

enum DemoEmailKind { verifyEmail, resetPassword }

class DemoEmail extends Equatable {
  const DemoEmail({
    required this.to,
    required this.kind,
    required this.code,
    required this.sentAt,
  });

  final String to;
  final DemoEmailKind kind;
  final String code;
  final DateTime sentAt;

  @override
  List<Object?> get props => [to, kind, code, sentAt];
}

/// DEMO ONLY. Stands in for a real mailbox: every code the demo backend
/// "emails" lands here and is shown on screen in the "Demo inbox" card.
/// A real backend (Firebase, Supabase, custom API) has no outbox.
class DemoOutbox extends ValueNotifier<List<DemoEmail>> {
  DemoOutbox() : super(const []);

  void deliver(DemoEmail email) => value = [email, ...value].take(5).toList();

  DemoEmail? latestFor(String to, DemoEmailKind kind) {
    for (final e in value) {
      if (e.to == to && e.kind == kind) return e;
    }
    return null;
  }
}
