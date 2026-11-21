import 'package:material_ui/material_ui.dart';

/// Design tokens. Art direction: a passport / membership card.
/// Oxblood leather cover, gold foil, security-paper pages, ink text.
/// A client rebrand = change these colors (and the two fonts).
abstract final class AppColors {
  static const cover = Color(0xFF6D1D2A); // oxblood leather
  static const coverDeep = Color(0xFF4E1420);
  static const foil = Color(0xFFC29A4E); // gold foil, only on the cover + stamps
  static const paper = Color(0xFFECF0EA); // security paper (cool, green-grey)
  static const page = Color(0xFFFAFBF7); // the data page
  static const ink = Color(0xFF1C2321);
  static const inkSoft = Color(0xFF59625E);
  static const rule = Color(0xFFCDD5CF);
  static const verified = Color(0xFF1E6B59); // stamp ink for "verified"
  static const warning = Color(0xFFB7791F);

  // Night (dark theme): the passport on a desk at night.
  static const nightPaper = Color(0xFF151918);
  static const nightPage = Color(0xFF1D2220);
  static const nightRule = Color(0xFF333B38);
}

abstract final class AppFonts {
  static const text = 'Readex';
  static const display = 'NotoKufi';
  static const mrz = 'PlexMono';
}

abstract final class AppRadii {
  static const field = 4.0;
  static const button = 6.0;
  static const page = 10.0;
}

abstract final class AppTheme {
  static ThemeData light() => _build(
    const ColorScheme(
      brightness: Brightness.light,
      primary: AppColors.cover,
      onPrimary: Color(0xFFFFF8EE),
      primaryContainer: Color(0xFFF3E3E2),
      onPrimaryContainer: AppColors.coverDeep,
      secondary: AppColors.verified,
      onSecondary: Colors.white,
      tertiary: AppColors.foil,
      error: Color(0xFFB3261E),
      onError: Colors.white,
      errorContainer: Color(0xFFF8E3DF),
      onErrorContainer: Color(0xFF7A1A12),
      surface: AppColors.page,
      onSurface: AppColors.ink,
      onSurfaceVariant: AppColors.inkSoft,
      surfaceContainerLowest: AppColors.paper,
      surfaceContainerLow: Color(0xFFF2F5F0),
      surfaceContainer: Color(0xFFE6EBE5),
      outline: Color(0xFFB4BEB8),
      outlineVariant: AppColors.rule,
    ),
  );

  static ThemeData dark() => _build(
    const ColorScheme(
      brightness: Brightness.dark,
      primary: Color(0xFFD9B36C), // foil reads better than oxblood at night
      onPrimary: Color(0xFF2A0D13),
      primaryContainer: Color(0xFF3E1A20),
      onPrimaryContainer: Color(0xFFF2D9C4),
      secondary: Color(0xFF6FC2AA),
      onSecondary: Color(0xFF07261F),
      tertiary: AppColors.foil,
      error: Color(0xFFFF9A8E),
      onError: Color(0xFF3B0A06),
      errorContainer: Color(0xFF4B1C17),
      onErrorContainer: Color(0xFFFFDAD4),
      surface: AppColors.nightPage,
      onSurface: Color(0xFFE7EAE4),
      onSurfaceVariant: Color(0xFFA4ADA8),
      surfaceContainerLowest: AppColors.nightPaper,
      surfaceContainerLow: Color(0xFF191E1C),
      surfaceContainer: Color(0xFF242A28),
      outline: Color(0xFF4A524F),
      outlineVariant: AppColors.nightRule,
    ),
  );

  static ThemeData _build(ColorScheme c) {
    final base = ThemeData(useMaterial3: true, colorScheme: c, fontFamily: AppFonts.text);
    OutlineInputBorder border(Color color, [double w = 1]) => OutlineInputBorder(
      borderRadius: BorderRadius.circular(AppRadii.field),
      borderSide: BorderSide(color: color, width: w),
    );
    const displayStyle = TextStyle(
      fontFamily: AppFonts.display,
      fontFamilyFallback: [AppFonts.text],
    );

    return base.copyWith(
      scaffoldBackgroundColor: c.surfaceContainerLowest,
      textTheme: base.textTheme.copyWith(
        headlineSmall: base.textTheme.headlineSmall
            ?.merge(displayStyle)
            .copyWith(fontWeight: FontWeight.w800, fontSize: 25, height: 1.45, color: c.onSurface),
        titleMedium: base.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
        bodyMedium: base.textTheme.bodyMedium?.copyWith(height: 1.6),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: c.brightness == Brightness.light ? Colors.white : c.surfaceContainerLow,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
        border: border(c.outline),
        enabledBorder: border(c.outline),
        focusedBorder: border(c.primary, 1.8),
        errorBorder: border(c.error),
        focusedErrorBorder: border(c.error, 1.8),
        labelStyle: TextStyle(color: c.onSurfaceVariant),
        floatingLabelStyle: WidgetStateTextStyle.resolveWith(
          (s) => TextStyle(
            color: s.contains(WidgetState.error) ? c.error : c.primary,
            fontWeight: FontWeight.w600,
          ),
        ),
        hintStyle: TextStyle(color: c.onSurfaceVariant.withValues(alpha: .7)),
        prefixIconColor: c.onSurfaceVariant,
        errorMaxLines: 2,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.button)),
          textStyle: const TextStyle(
            fontFamily: AppFonts.text,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(48),
          foregroundColor: c.onSurface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.button)),
          side: BorderSide(color: c.outline),
          textStyle: const TextStyle(
            fontFamily: AppFonts.text,
            fontSize: 15,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          textStyle: const TextStyle(fontFamily: AppFonts.text, fontWeight: FontWeight.w600),
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: c.surface,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadii.page),
          side: BorderSide(color: c.outlineVariant),
        ),
      ),
      dividerTheme: DividerThemeData(color: c.outlineVariant, space: 1, thickness: 1),
      snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
    );
  }
}
