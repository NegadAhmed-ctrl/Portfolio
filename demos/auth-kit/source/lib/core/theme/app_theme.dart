import 'package:material_ui/material_ui.dart';

/// Design tokens. A client rebrand = change these colors (and the font).
abstract final class AppColors {
  static const brandDeep = Color(0xFF221A66);
  static const brand = Color(0xFF5B47E0);
  static const brandLight = Color(0xFF8B6CFF);
  static const success = Color(0xFF12A36B);
  static const warning = Color(0xFFE59A1A);
  static const brandGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [brandDeep, brand, brandLight],
  );
}

abstract final class AppTheme {
  static const _font = 'Cairo';

  static ThemeData light() => _build(const ColorScheme(
        brightness: Brightness.light,
        primary: AppColors.brand,
        onPrimary: Colors.white,
        primaryContainer: Color(0xFFE9E5FF),
        onPrimaryContainer: Color(0xFF2A1E86),
        secondary: Color(0xFF7A6BE8),
        onSecondary: Colors.white,
        error: Color(0xFFD13A4A),
        onError: Colors.white,
        errorContainer: Color(0xFFFDE8EA),
        onErrorContainer: Color(0xFF8C1A26),
        surface: Colors.white,
        onSurface: Color(0xFF16142B),
        onSurfaceVariant: Color(0xFF615E82),
        surfaceContainerLowest: Color(0xFFF6F5FB),
        surfaceContainerLow: Color(0xFFF3F1FA),
        surfaceContainer: Color(0xFFEFEDF8),
        outline: Color(0xFFD9D6EA),
        outlineVariant: Color(0xFFE8E6F3),
      ));

  static ThemeData dark() => _build(const ColorScheme(
        brightness: Brightness.dark,
        primary: Color(0xFFA594FF),
        onPrimary: Color(0xFF140F33),
        primaryContainer: Color(0xFF2E2670),
        onPrimaryContainer: Color(0xFFE4DEFF),
        secondary: Color(0xFFB9ADFF),
        onSecondary: Color(0xFF140F33),
        error: Color(0xFFFF7A86),
        onError: Color(0xFF3B0A10),
        errorContainer: Color(0xFF4A1820),
        onErrorContainer: Color(0xFFFFD9DC),
        surface: Color(0xFF181730),
        onSurface: Color(0xFFEDECFA),
        onSurfaceVariant: Color(0xFFA9A6C8),
        surfaceContainerLowest: Color(0xFF0F0E1F),
        surfaceContainerLow: Color(0xFF14132A),
        surfaceContainer: Color(0xFF1F1D3A),
        outline: Color(0xFF34315A),
        outlineVariant: Color(0xFF29274A),
      ));

  static ThemeData _build(ColorScheme c) {
    final base = ThemeData(useMaterial3: true, colorScheme: c, fontFamily: _font);
    final radius = BorderRadius.circular(14);
    OutlineInputBorder border(Color color, [double w = 1]) =>
        OutlineInputBorder(borderRadius: radius, borderSide: BorderSide(color: color, width: w));

    return base.copyWith(
      scaffoldBackgroundColor: c.surfaceContainerLowest,
      textTheme: base.textTheme.copyWith(
        headlineSmall: base.textTheme.headlineSmall
            ?.copyWith(fontWeight: FontWeight.w800, height: 1.25, color: c.onSurface),
        titleMedium: base.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        bodyMedium: base.textTheme.bodyMedium?.copyWith(height: 1.5),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: c.brightness == Brightness.light ? c.surfaceContainerLow : c.surfaceContainer,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: border(c.outline),
        enabledBorder: border(c.outlineVariant),
        focusedBorder: border(c.primary, 1.6),
        errorBorder: border(c.error),
        focusedErrorBorder: border(c.error, 1.6),
        labelStyle: TextStyle(color: c.onSurfaceVariant),
        hintStyle: TextStyle(color: c.onSurfaceVariant.withValues(alpha: .7)),
        errorMaxLines: 2,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(54),
          shape: RoundedRectangleBorder(borderRadius: radius),
          textStyle: const TextStyle(fontFamily: _font, fontSize: 16, fontWeight: FontWeight.w700),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(50),
          shape: RoundedRectangleBorder(borderRadius: radius),
          side: BorderSide(color: c.outline),
          textStyle: const TextStyle(fontFamily: _font, fontSize: 15, fontWeight: FontWeight.w700),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          textStyle: const TextStyle(fontFamily: _font, fontWeight: FontWeight.w700),
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: c.surface,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(22),
          side: BorderSide(color: c.outlineVariant),
        ),
      ),
      snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
    );
  }
}
