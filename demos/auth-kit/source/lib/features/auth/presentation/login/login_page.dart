import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/config/app_services.dart';
import '../../../../core/l10n/l10n.dart';
import '../../../../core/routing/app_router.dart';
import '../../../../core/widgets/auth_scaffold.dart';
import '../../../../core/widgets/form_widgets.dart';
import '../../data/demo_auth_repository.dart';
import '../shared/form_status.dart';
import 'login_cubit.dart';

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context) => BlocProvider(
        create: (context) => LoginCubit(context.read<AppServices>().auth),
        child: const _LoginView(),
      );
}

class _LoginView extends StatefulWidget {
  const _LoginView();

  @override
  State<_LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<_LoginView> {
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _fillDemo() {
    final cubit = context.read<LoginCubit>()..fillDemoAccount();
    _email.text = cubit.state.email;
    _password.text = cubit.state.password;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final isDemo = context.read<AppServices>().isDemo;
    return BlocBuilder<LoginCubit, LoginState>(
      builder: (context, state) {
        final cubit = context.read<LoginCubit>();
        final busy = state.status == FormStatus.submitting;
        return AuthScaffold(
          title: l10n.loginTitle,
          subtitle: l10n.loginSubtitle,
          icon: Icons.login_rounded,
          child: AutofillGroup(
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              FailureBanner(failure: state.failure),
              AppTextField(
                key: const Key('login-email'),
                label: l10n.emailLabel,
                hint: l10n.emailHint,
                controller: _email,
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
                key: const Key('login-password'),
                label: l10n.passwordLabel,
                controller: _password,
                onChanged: cubit.passwordChanged,
                errorText: l10n.field(state.passwordError),
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => cubit.submit(),
                enabled: !busy,
              ),
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: TextButton(
                  onPressed: busy
                      ? null
                      : () => context.push(Uri(
                            path: Routes.forgot,
                            queryParameters: {
                              if (state.email.trim().isNotEmpty) 'email': state.email.trim(),
                            },
                          ).toString()),
                  child: Text(l10n.forgotPasswordLink),
                ),
              ),
              const SizedBox(height: 6),
              PrimaryButton(
                key: const Key('login-submit'),
                label: l10n.signInButton,
                loading: busy,
                onPressed: cubit.submit,
              ),
              if (isDemo) ...[
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  key: const Key('fill-demo'),
                  onPressed: busy ? null : _fillDemo,
                  icon: const Icon(Icons.bolt_rounded, size: 20),
                  label: Text(l10n.useDemoAccount),
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.demoAccountHint(
                      DemoAuthRepository.demoEmail, DemoAuthRepository.demoPassword),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
              ],
              const SizedBox(height: 18),
              SwitchAuthLink(
                text: l10n.noAccount,
                action: l10n.createAccountLink,
                onTap: busy ? null : () => context.go(Routes.register),
              ),
            ]),
          ),
        );
      },
    );
  }
}
