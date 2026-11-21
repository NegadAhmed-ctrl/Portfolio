import 'dart:async';

import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/config/app_services.dart';
import '../../../../core/l10n/l10n.dart';
import '../../../../core/routing/app_router.dart';
import '../../../../core/widgets/auth_scaffold.dart';
import '../../../../core/widgets/form_widgets.dart';
import '../../data/demo_outbox.dart';
import '../session/auth_session_cubit.dart';
import '../shared/demo_inbox_card.dart';
import '../shared/form_status.dart';
import 'otp_cubit.dart';

/// Code entry for both flows:
/// * [OtpPurpose.verifyEmail]: after sign-up (email comes from the session).
/// * [OtpPurpose.resetPassword]: after "forgot password" (email in the URL).
class VerifyCodePage extends StatelessWidget {
  const VerifyCodePage({super.key, required this.purpose, this.email});

  final OtpPurpose purpose;
  final String? email;

  @override
  Widget build(BuildContext context) {
    final services = context.read<AppServices>();
    final target = email ?? context.read<AuthSessionCubit>().state.user?.email ?? '';
    return BlocProvider(
      create: (_) => OtpCubit(
        repository: services.auth,
        purpose: purpose,
        email: target,
        resendCooldown: services.resendCooldown,
      ),
      child: const _VerifyView(),
    );
  }
}

class _VerifyView extends StatelessWidget {
  const _VerifyView();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final cubit = context.read<OtpCubit>();
    final isReset = cubit.purpose == OtpPurpose.resetPassword;

    return BlocConsumer<OtpCubit, OtpState>(
      listenWhen: (a, b) => a.status != b.status && b.status == FormStatus.success,
      listener: (context, state) {
        // Email verification: the session update redirects to /home.
        if (isReset) context.go(Routes.reset, extra: state.resetToken);
      },
      builder: (context, state) {
        final busy = state.status == FormStatus.submitting;
        return AuthScaffold(
          title: isReset ? l10n.resetCodeTitle : l10n.verifyEmailTitle,
          subtitle: l10n.verifyEmailSubtitle(cubit.email),
          code: isReset ? 'RESET<CODE' : 'VERIFY<EMAIL',
          onBack: isReset ? () => context.go(Routes.login) : null,
          below: DemoInboxCard(
            email: cubit.email,
            kind: isReset ? DemoEmailKind.resetPassword : DemoEmailKind.verifyEmail,
            onUseCode: (code) {
              cubit.codeChanged(code);
              cubit.submit();
            },
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            if (state.resent) InfoBanner(text: l10n.codeResent),
            FailureBanner(failure: state.failure),
            OtpField(
              value: state.code,
              enabled: !busy,
              errorText: l10n.field(state.codeError),
              onChanged: cubit.codeChanged,
              onCompleted: cubit.submit,
            ),
            const SizedBox(height: 20),
            PrimaryButton(
              key: const Key('otp-submit'),
              label: isReset ? l10n.continueButton : l10n.verifyButton,
              loading: busy,
              onPressed: cubit.submit,
            ),
            const SizedBox(height: 10),
            _ResendButton(
              availableAt: state.resendAvailableAt,
              loading: state.resending,
              onPressed: busy ? null : cubit.resend,
            ),
            if (!isReset)
              TextButton(
                onPressed: busy ? null : () => context.read<AuthSessionCubit>().signOut(),
                child: Text(l10n.useAnotherAccount),
              ),
          ]),
        );
      },
    );
  }
}

class _ResendButton extends StatefulWidget {
  const _ResendButton({required this.availableAt, required this.loading, required this.onPressed});

  final DateTime availableAt;
  final bool loading;
  final VoidCallback? onPressed;

  @override
  State<_ResendButton> createState() => _ResendButtonState();
}

class _ResendButtonState extends State<_ResendButton> {
  Timer? _timer;

  int get _secondsLeft {
    final ms = widget.availableAt.difference(DateTime.now()).inMilliseconds;
    return ms <= 0 ? 0 : (ms / 1000).ceil();
  }

  @override
  void initState() {
    super.initState();
    _tick();
  }

  @override
  void didUpdateWidget(_ResendButton old) {
    super.didUpdateWidget(old);
    if (old.availableAt != widget.availableAt) _tick();
  }

  void _tick() {
    _timer?.cancel();
    if (_secondsLeft > 0) {
      _timer = Timer.periodic(const Duration(seconds: 1), (t) {
        if (!mounted) return t.cancel();
        setState(() {});
        if (_secondsLeft == 0) t.cancel();
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final left = _secondsLeft;
    return OutlinedButton.icon(
      key: const Key('otp-resend'),
      onPressed: left > 0 || widget.loading ? null : widget.onPressed,
      icon: widget.loading
          ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
          : const Icon(Icons.refresh_rounded, size: 20),
      label: Text(left > 0 ? l10n.resendIn(left) : l10n.resendCode),
    );
  }
}
