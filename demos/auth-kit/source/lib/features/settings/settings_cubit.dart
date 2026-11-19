import 'dart:ui';

import 'package:equatable/equatable.dart';
import 'package:material_ui/material_ui.dart' show ThemeMode;
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/storage/key_value_store.dart';

class SettingsState extends Equatable {
  const SettingsState({this.themeMode = ThemeMode.system, this.locale = const Locale('ar')});

  final ThemeMode themeMode;
  final Locale locale;

  bool get isArabic => locale.languageCode == 'ar';

  @override
  List<Object?> get props => [themeMode, locale];
}

/// Theme + language, remembered between visits.
class SettingsCubit extends Cubit<SettingsState> {
  SettingsCubit(this._store, {Locale? fallbackLocale})
      : super(SettingsState(locale: fallbackLocale ?? const Locale('ar')));

  static const _themeKey = 'settings.theme';
  static const _localeKey = 'settings.locale';
  static const supported = ['ar', 'en'];

  final KeyValueStore _store;

  Future<void> load() async {
    final theme = await _store.read(_themeKey);
    final lang = await _store.read(_localeKey);
    emit(SettingsState(
      themeMode: ThemeMode.values.firstWhere(
        (m) => m.name == theme,
        orElse: () => state.themeMode,
      ),
      locale: supported.contains(lang) ? Locale(lang!) : state.locale,
    ));
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    emit(SettingsState(themeMode: mode, locale: state.locale));
    await _store.write(_themeKey, mode.name);
  }

  /// light → dark → system → light…
  Future<void> cycleTheme() => setThemeMode(switch (state.themeMode) {
        ThemeMode.light => ThemeMode.dark,
        ThemeMode.dark => ThemeMode.system,
        ThemeMode.system => ThemeMode.light,
      });

  Future<void> toggleLocale() async {
    final next = state.isArabic ? const Locale('en') : const Locale('ar');
    emit(SettingsState(themeMode: state.themeMode, locale: next));
    await _store.write(_localeKey, next.languageCode);
  }
}
