import 'package:flutter/foundation.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter/semantics.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'core/config/app_services.dart';
import 'core/storage/key_value_store.dart';
import 'features/auth/data/demo_auth_repository.dart';
import 'features/auth/data/demo_outbox.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // Flutter web paints on a canvas; turning semantics on builds the
  // accessibility tree so screen readers (and browser tests) can use the app.
  if (kIsWeb) SemanticsBinding.instance.ensureSemantics();

  final store = SharedPrefsStore(SharedPreferencesAsync());
  final outbox = DemoOutbox();
  final services = AppServices(
    store: store,
    outbox: outbox,
    auth: DemoAuthRepository(store: store, outbox: outbox),
    // Production with Firebase (after `flutterfire configure`):
    //   await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
    //   auth: FirebaseAuthRepository(), outbox: null,
  );

  final deviceLang = PlatformDispatcher.instance.locale.languageCode;
  runApp(AuthKitApp(
    services: services,
    initialLocale: Locale(deviceLang == 'en' ? 'en' : 'ar'),
  ));
}
