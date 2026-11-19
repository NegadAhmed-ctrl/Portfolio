import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/config/app_services.dart';
import '../../../../core/l10n/l10n.dart';
import '../../../../core/routing/app_router.dart';
import '../../../../core/widgets/auth_scaffold.dart';
import '../../../../core/widgets/form_widgets.dart';
import '../shared/form_status.dart';
import 'forgot_password_cubit.dart';

class ForgotPasswordPage extends StatelessWidget {
  const ForgotPasswordPage({super.key, this.initialEmail = ''});

  final String initialEmail;

  @override
  Widget build(BuildContext context) => BlocProvider(
        create: (context) => ForgotPasswordCubit(
          context.read<AppServices>().auth,
          initialEmail: initialEmail,
        ),
        child: const _ForgotView(),
      );
}

class _ForgotView extends StatelessWidget {
  const _ForgotView();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return BlocConsumer<ForgotPasswordCubit, ForgotPasswordState>(
      listenWhen: (a, b) => a.status != b.status && b.status == FormStatus.success,
      listener: (context, state) => context.go(Uri(
        path: Routes.forgotCode,
        queryParameters: {'email': state.email.trim()},
      ).toString()),
      builder: (context, state) {
        final cubit = context.read<ForgotPasswordCubit>();
        final busy = state.status == FormStatus.submitting;
        return AuthScaffold(
          title: l10n.forgotTitle,
          subtitle: l10n.forgotSubtitle,
          icon: Icons.lock_reset_rounded,
          onBack: () => context.canPop() ? context.pop() : context.go(Routes.login),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            FailureBanner(failure: state.failure),
            AppTextField(
              key: const Key('forgot-email'),
              label: l10n.emailLabel,
              hint: l10n.emailHint,
              initialValue: state.email,
              onChanged: cubit.emailChanged,
              errorText: l10n.field(state.emailError),
              icon: Icons.alternate_email_rounded,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              textDirection: TextDirection.ltr,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => cubit.submit(),
              enabled: !busy,
            ),
            const SizedBox(height: 22),
            PrimaryButton(
              key: const Key('forgot-submit'),
              label: l10n.sendCodeButton,
              loading: busy,
              onPressed: cubit.submit,
            ),
            const SizedBox(height: 10),
            TextButton(
              onPressed: busy ? null : () => context.go(Routes.login),
              child: Text(l10n.backToSignIn),
            ),
          ]),
        );
      },
    );
  }
}
