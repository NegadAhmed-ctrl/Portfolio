import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/config/app_services.dart';
import '../../../../core/l10n/l10n.dart';
import '../../../../core/routing/app_router.dart';
import '../../../../core/widgets/auth_scaffold.dart';
import '../../../../core/widgets/passport.dart';
import '../../../../core/widgets/form_widgets.dart';
import '../shared/form_status.dart';
import 'reset_password_cubit.dart';

class ResetPasswordPage extends StatelessWidget {
  const ResetPasswordPage({super.key, required this.resetToken});

  final String resetToken;

  @override
  Widget build(BuildContext context) => BlocProvider(
    create: (context) =>
        ResetPasswordCubit(context.read<AppServices>().auth, resetToken: resetToken),
    child: const _ResetView(),
  );
}

class _ResetView extends StatelessWidget {
  const _ResetView();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return BlocConsumer<ResetPasswordCubit, ResetPasswordState>(
      listenWhen: (a, b) => a.status != b.status && b.status == FormStatus.success,
      listener: (context, _) => context.go(Routes.resetDone),
      builder: (context, state) {
        final cubit = context.read<ResetPasswordCubit>();
        final busy = state.status == FormStatus.submitting;
        return AuthScaffold(
          title: l10n.resetTitle,
          subtitle: l10n.resetSubtitle,
          code: 'NEW<PASSWORD',
          child: AutofillGroup(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                FailureBanner(failure: state.failure),
                PasswordField(
                  key: const Key('reset-password'),
                  label: l10n.newPasswordLabel,
                  onChanged: cubit.passwordChanged,
                  errorText: l10n.field(state.passwordError),
                  isNewPassword: true,
                  enabled: !busy,
                ),
                PasswordStrengthMeter(strength: state.strength),
                const SizedBox(height: 14),
                PasswordField(
                  key: const Key('reset-confirm'),
                  label: l10n.confirmPasswordLabel,
                  onChanged: cubit.confirmChanged,
                  errorText: l10n.field(state.confirmError),
                  isNewPassword: true,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => cubit.submit(),
                  enabled: !busy,
                ),
                const SizedBox(height: 22),
                PrimaryButton(
                  key: const Key('reset-submit'),
                  label: l10n.savePasswordButton,
                  loading: busy,
                  onPressed: cubit.submit,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class ResetSuccessPage extends StatelessWidget {
  const ResetSuccessPage({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return AuthScaffold(
      title: l10n.resetSuccessTitle,
      subtitle: l10n.resetSuccessBody,
      code: 'PASSWORD<CHANGED',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(child: InkStamp(text: l10n.stampDone, size: 104)),
          const SizedBox(height: 24),
          PrimaryButton(
            key: const Key('reset-done'),
            label: l10n.backToSignIn,
            onPressed: () => context.go(Routes.login),
          ),
        ],
      ),
    );
  }
}
