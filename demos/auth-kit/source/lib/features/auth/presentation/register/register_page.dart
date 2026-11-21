import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/config/app_services.dart';
import '../../../../core/l10n/l10n.dart';
import '../../../../core/routing/app_router.dart';
import '../../../../core/widgets/auth_scaffold.dart';
import '../../../../core/widgets/form_widgets.dart';
import '../shared/form_status.dart';
import 'register_cubit.dart';

class RegisterPage extends StatelessWidget {
  const RegisterPage({super.key});

  @override
  Widget build(BuildContext context) => BlocProvider(
        create: (context) => RegisterCubit(context.read<AppServices>().auth),
        child: const _RegisterView(),
      );
}

class _RegisterView extends StatelessWidget {
  const _RegisterView();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    // On success the session becomes "authenticated, not verified" and the
    // router moves to the verification screen by itself.
    return BlocBuilder<RegisterCubit, RegisterState>(
      builder: (context, state) {
        final cubit = context.read<RegisterCubit>();
        final busy = state.status == FormStatus.submitting;
        return AuthScaffold(
          title: l10n.registerTitle,
          subtitle: l10n.registerSubtitle,
          code: 'SIGN<UP',
          child: AutofillGroup(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              FailureBanner(failure: state.failure),
              AppTextField(
                key: const Key('register-name'),
                label: l10n.nameLabel,
                hint: l10n.nameHint,
                onChanged: cubit.nameChanged,
                errorText: l10n.field(state.nameError),
                icon: Icons.person_outline_rounded,
                keyboardType: TextInputType.name,
                autofillHints: const [AutofillHints.name],
                enabled: !busy,
              ),
              const SizedBox(height: 14),
              AppTextField(
                key: const Key('register-email'),
                label: l10n.emailLabel,
                hint: l10n.emailHint,
                onChanged: cubit.emailChanged,
                errorText: l10n.field(state.emailError),
                icon: Icons.alternate_email_rounded,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                textDirection: TextDirection.ltr,
                enabled: !busy,
              ),
              const SizedBox(height: 14),
              PasswordField(
                key: const Key('register-password'),
                label: l10n.passwordLabel,
                onChanged: cubit.passwordChanged,
                errorText: l10n.field(state.passwordError),
                isNewPassword: true,
                enabled: !busy,
              ),
              PasswordStrengthMeter(strength: state.strength),
              const SizedBox(height: 14),
              PasswordField(
                key: const Key('register-confirm'),
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
                key: const Key('register-submit'),
                label: l10n.createAccountButton,
                loading: busy,
                onPressed: cubit.submit,
              ),
              const SizedBox(height: 14),
              SwitchAuthLink(
                text: l10n.haveAccount,
                action: l10n.signInLink,
                onTap: busy ? null : () => context.go(Routes.login),
              ),
            ]),
          ),
        );
      },
    );
  }
}
