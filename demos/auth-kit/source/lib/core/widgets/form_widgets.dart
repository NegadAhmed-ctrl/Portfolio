import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';

import '../../features/auth/domain/auth_failure.dart';
import '../l10n/l10n.dart';
import '../theme/app_theme.dart';
import '../validation/validators.dart';

/// Text field with the kit's defaults (label above value, error under it,
/// keyboard action wired to the next field or submit).
class AppTextField extends StatelessWidget {
  const AppTextField({
    super.key,
    required this.label,
    required this.onChanged,
    this.initialValue,
    this.controller,
    this.hint,
    this.errorText,
    this.icon,
    this.keyboardType,
    this.textInputAction = TextInputAction.next,
    this.autofillHints,
    this.onSubmitted,
    this.obscureText = false,
    this.suffix,
    this.enabled = true,
    this.autofocus = false,
    this.textDirection,
  });

  final String label;
  final ValueChanged<String> onChanged;
  final String? initialValue;
  final TextEditingController? controller;
  final String? hint;
  final String? errorText;
  final IconData? icon;
  final TextInputType? keyboardType;
  final TextInputAction textInputAction;
  final Iterable<String>? autofillHints;
  final ValueChanged<String>? onSubmitted;
  final bool obscureText;
  final Widget? suffix;
  final bool enabled;
  final bool autofocus;
  final TextDirection? textDirection;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      initialValue: controller == null ? initialValue : null,
      onChanged: onChanged,
      onFieldSubmitted: onSubmitted,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      autofillHints: enabled ? autofillHints : null,
      obscureText: obscureText,
      enabled: enabled,
      autofocus: autofocus,
      textDirection: textDirection,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        errorText: errorText,
        prefixIcon: icon == null ? null : Icon(icon, size: 20),
        suffixIcon: suffix,
      ),
    );
  }
}

class PasswordField extends StatefulWidget {
  const PasswordField({
    super.key,
    required this.label,
    required this.onChanged,
    this.controller,
    this.errorText,
    this.textInputAction = TextInputAction.next,
    this.onSubmitted,
    this.isNewPassword = false,
    this.enabled = true,
  });

  final String label;
  final ValueChanged<String> onChanged;
  final TextEditingController? controller;
  final String? errorText;
  final TextInputAction textInputAction;
  final ValueChanged<String>? onSubmitted;
  final bool isNewPassword;
  final bool enabled;

  @override
  State<PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<PasswordField> {
  bool _obscure = true;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return AppTextField(
      label: widget.label,
      controller: widget.controller,
      onChanged: widget.onChanged,
      errorText: widget.errorText,
      icon: Icons.lock_outline_rounded,
      obscureText: _obscure,
      enabled: widget.enabled,
      keyboardType: TextInputType.visiblePassword,
      textInputAction: widget.textInputAction,
      onSubmitted: widget.onSubmitted,
      // Passwords are Latin even in the Arabic UI.
      textDirection: TextDirection.ltr,
      autofillHints: [widget.isNewPassword ? AutofillHints.newPassword : AutofillHints.password],
      suffix: IconButton(
        tooltip: _obscure ? l10n.showPassword : l10n.hidePassword,
        icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20),
        onPressed: () => setState(() => _obscure = !_obscure),
      ),
    );
  }
}

/// Primary action with a built-in loading state (disabled + spinner).
class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: loading ? null : onPressed,
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 180),
        child: loading
            ? Semantics(
                key: const ValueKey('loading'),
                label: context.l10n.loading,
                child: const SizedBox.square(
                  dimension: 22,
                  child: CircularProgressIndicator(strokeWidth: 2.4),
                ),
              )
            : Text(label, key: const ValueKey('label')),
      ),
    );
  }
}

/// Shows a backend failure above the form, announced to screen readers.
class FailureBanner extends StatelessWidget {
  const FailureBanner({super.key, required this.failure});

  final AuthFailure? failure;

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme;
    return AnimatedSize(
      duration: const Duration(milliseconds: 200),
      alignment: Alignment.topCenter,
      child: failure == null
          ? const SizedBox(width: double.infinity)
          : Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Semantics(
                liveRegion: true,
                child: Container(
                  key: const Key('failure-banner'),
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: c.errorContainer,
                    border: BorderDirectional(start: BorderSide(color: c.error, width: 3)),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline_rounded, color: c.onErrorContainer, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          context.l10n.failure(failure!),
                          style: TextStyle(color: c.onErrorContainer, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
    );
  }
}

class InfoBanner extends StatelessWidget {
  const InfoBanner({super.key, required this.text, this.icon = Icons.mark_email_read_outlined});

  final String text;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme;
    return Semantics(
      liveRegion: true,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: c.primaryContainer,
          border: BorderDirectional(start: BorderSide(color: c.primary, width: 3)),
        ),
        child: Row(
          children: [
            Icon(icon, color: c.onPrimaryContainer, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                text,
                style: TextStyle(color: c.onPrimaryContainer, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class PasswordStrengthMeter extends StatelessWidget {
  const PasswordStrengthMeter({super.key, required this.strength});

  final PasswordStrength strength;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = Theme.of(context).colorScheme;
    final (int level, Color color, String label) = switch (strength) {
      PasswordStrength.empty => (0, c.outline, ''),
      PasswordStrength.weak => (1, c.error, l10n.strengthWeak),
      PasswordStrength.fair => (2, AppColors.warning, l10n.strengthFair),
      PasswordStrength.good => (3, AppColors.verified, l10n.strengthGood),
      PasswordStrength.strong => (4, AppColors.verified, l10n.strengthStrong),
    };
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              for (var i = 1; i <= 4; i++) ...[
                Expanded(
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    height: 4,
                    decoration: BoxDecoration(color: i <= level ? color : c.outlineVariant),
                  ),
                ),
                if (i < 4) const SizedBox(width: 6),
              ],
              if (label.isNotEmpty) ...[
                const SizedBox(width: 10),
                Text(
                  label,
                  style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 13),
                ),
              ],
            ],
          ),
          const SizedBox(height: 6),
          Text(
            l10n.passwordRules,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: c.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

/// Six boxes over one real text field: paste, SMS/email autofill and
/// screen readers all work, and Arabic-Indic digits are accepted.
class OtpField extends StatefulWidget {
  const OtpField({
    super.key,
    required this.value,
    required this.onChanged,
    required this.onCompleted,
    this.errorText,
    this.enabled = true,
  });

  final String value;
  final ValueChanged<String> onChanged;
  final VoidCallback onCompleted;
  final String? errorText;
  final bool enabled;

  @override
  State<OtpField> createState() => _OtpFieldState();
}

class _OtpFieldState extends State<OtpField> {
  late final _controller = TextEditingController(text: widget.value);
  final _focus = FocusNode();

  @override
  void initState() {
    super.initState();
    _focus.addListener(() => setState(() {}));
  }

  @override
  void didUpdateWidget(OtpField old) {
    super.didUpdateWidget(old);
    if (widget.value != _controller.text) {
      _controller.value = TextEditingValue(
        text: widget.value,
        selection: TextSelection.collapsed(offset: widget.value.length),
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = Theme.of(context).colorScheme;
    final hasError = widget.errorText != null;
    final digits = widget.value;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Directionality(
          textDirection: TextDirection.ltr,
          child: Stack(
            children: [
              // The cells are only a picture of the hidden field's value;
              // screen readers get the value from the field itself.
              ExcludeSemantics(
                child: Row(
                  children: [
                    for (var i = 0; i < Validators.otpLength; i++) ...[
                      Expanded(
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          height: 58,
                          alignment: Alignment.center,
                          // Passport-number cells: square corners, a heavier
                          // underline that turns oxblood on the active cell.
                          decoration: BoxDecoration(
                            color: c.brightness == Brightness.light
                                ? Colors.white
                                : c.surfaceContainerLow,
                            border: Border(
                              top: BorderSide(color: hasError ? c.error : c.outline),
                              left: BorderSide(color: hasError ? c.error : c.outline),
                              right: BorderSide(color: hasError ? c.error : c.outline),
                              bottom: BorderSide(
                                width: _isActive(i) ? 3 : 1.5,
                                color: hasError
                                    ? c.error
                                    : _isActive(i)
                                    ? c.primary
                                    : c.onSurfaceVariant,
                              ),
                            ),
                          ),
                          child: Text(
                            i < digits.length ? digits[i] : '',
                            style: const TextStyle(
                              fontFamily: AppFonts.mrz,
                              fontSize: 26,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ),
                      if (i < Validators.otpLength - 1) const SizedBox(width: 8),
                    ],
                  ],
                ),
              ),
              Positioned.fill(
                child: Opacity(
                  opacity: 0.011,
                  child: TextField(
                    key: const Key('otp-input'),
                    controller: _controller,
                    focusNode: _focus,
                    enabled: widget.enabled,
                    keyboardType: TextInputType.number,
                    autofillHints: const [AutofillHints.oneTimeCode],
                    showCursor: false,
                    enableInteractiveSelection: false,
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp('[0-9٠-٩]')),
                      LengthLimitingTextInputFormatter(Validators.otpLength),
                    ],
                    decoration: InputDecoration(
                      labelText: context.l10n.otpLabel,
                      filled: false,
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                    ),
                    onChanged: (v) {
                      final normalized = Validators.normalizeDigits(v);
                      widget.onChanged(normalized);
                      if (normalized.length == Validators.otpLength) widget.onCompleted();
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
        if (hasError)
          Padding(
            padding: const EdgeInsets.only(top: 8, left: 4, right: 4),
            child: Text(widget.errorText!, style: TextStyle(color: c.error, fontSize: 12.5)),
          ),
      ],
    );
  }

  bool _isActive(int i) =>
      _focus.hasFocus &&
      (i == widget.value.length ||
          (widget.value.length == Validators.otpLength && i == Validators.otpLength - 1));
}

/// "New here? Create an account" style link row.
class SwitchAuthLink extends StatelessWidget {
  const SwitchAuthLink({super.key, required this.text, required this.action, required this.onTap});

  final String text;
  final String action;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Wrap(
    alignment: WrapAlignment.center,
    crossAxisAlignment: WrapCrossAlignment.center,
    children: [
      Text(text, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
      TextButton(onPressed: onTap, child: Text(action)),
    ],
  );
}
