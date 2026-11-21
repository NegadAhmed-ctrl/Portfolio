import 'package:material_ui/material_ui.dart';

import '../../../../core/l10n/l10n.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/passport.dart';

/// Shown for a split second while the saved session is restored:
/// the closed passport cover.
class SplashPage extends StatelessWidget {
  const SplashPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cover,
      body: Center(
        child: Semantics(
          label: context.l10n.loading,
          child: const Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              FoilEmblem(size: 84),
              SizedBox(height: 24),
              SizedBox(
                width: 72,
                child: LinearProgressIndicator(
                  minHeight: 2,
                  color: AppColors.foil,
                  backgroundColor: Color(0x33C29A4E),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
