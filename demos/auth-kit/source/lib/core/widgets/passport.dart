import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';

import '../theme/app_theme.dart';

/// Visual vocabulary borrowed from passports and membership cards:
/// security-paper guilloché, a foil emblem, the machine-readable zone
/// (MRZ) and an ink stamp. Purely decorative pieces are excluded from
/// semantics so screen readers only hear the real content.

/// Fine interlaced sine waves, like the background print of a passport page.
class GuillochePainter extends CustomPainter {
  const GuillochePainter({required this.color, this.lines = 9, this.opacity = .55});

  final Color color;
  final int lines;
  final double opacity;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = .7
      ..color = color.withValues(alpha: opacity);
    final band = size.height / (lines + 1);
    for (var i = 0; i < lines; i++) {
      final y0 = band * (i + 1);
      for (final phase in [0.0, math.pi]) {
        final path = Path();
        for (double x = 0; x <= size.width; x += 4) {
          final y =
              y0 + math.sin(x / 38 + phase + i * .6) * band * .42 + math.sin(x / 11 + i) * 1.6;
          x == 0 ? path.moveTo(x, y) : path.lineTo(x, y);
        }
        canvas.drawPath(path, paint);
      }
    }
  }

  @override
  bool shouldRepaint(GuillochePainter old) => old.color != color || old.opacity != opacity;
}

/// The emblem stamped in foil on the cover: an eight-pointed star
/// (two squares) inside a double ring, with a keyhole in the middle.
class FoilEmblem extends StatelessWidget {
  const FoilEmblem({super.key, this.size = 72, this.color = AppColors.foil});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: SizedBox.square(
      dimension: size,
      child: CustomPaint(painter: _EmblemPainter(color)),
    ),
  );
}

class _EmblemPainter extends CustomPainter {
  const _EmblemPainter(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final r = size.shortestSide / 2;
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..color = color
      ..strokeWidth = math.max(1, r * .045);
    canvas.drawCircle(c, r * .96, stroke);
    canvas.drawCircle(c, r * .86, stroke..strokeWidth = math.max(.8, r * .022));
    // Eight-pointed star: two squares rotated 45° apart.
    for (final angle in [0.0, math.pi / 4]) {
      final path = Path();
      for (var k = 0; k < 4; k++) {
        final a = angle + k * math.pi / 2 - math.pi / 4;
        final p = c + Offset(math.cos(a), math.sin(a)) * r * .68;
        k == 0 ? path.moveTo(p.dx, p.dy) : path.lineTo(p.dx, p.dy);
      }
      path.close();
      canvas.drawPath(path, stroke..strokeWidth = math.max(1, r * .04));
    }
    // Keyhole.
    final fill = Paint()..color = color;
    canvas.drawCircle(c - Offset(0, r * .08), r * .11, fill);
    canvas.drawPath(
      Path()
        ..moveTo(c.dx - r * .07, c.dy)
        ..lineTo(c.dx + r * .07, c.dy)
        ..lineTo(c.dx + r * .1, c.dy + r * .24)
        ..lineTo(c.dx - r * .1, c.dy + r * .24)
        ..close(),
      fill,
    );
  }

  @override
  bool shouldRepaint(_EmblemPainter old) => old.color != color;
}

/// Machine-readable zone: fixed 44-character lines in a mono face,
/// padded with '<' exactly like a real passport.
class MrzBlock extends StatelessWidget {
  const MrzBlock({super.key, required this.lines, this.color});

  final List<String> lines;
  final Color? color;

  static const width = 44;

  /// Upper-cases, turns anything that isn't A–Z/0–9 into '<', pads to 44.
  static String line(String raw) {
    final cleaned = raw.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9<]'), '<');
    return cleaned.length >= width ? cleaned.substring(0, width) : cleaned.padRight(width, '<');
  }

  @override
  Widget build(BuildContext context) {
    final c = color ?? Theme.of(context).colorScheme.onSurfaceVariant;
    return ExcludeSemantics(
      child: Directionality(
        textDirection: TextDirection.ltr,
        child: FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(
            lines.map(line).join('\n'),
            style: TextStyle(
              fontFamily: AppFonts.mrz,
              fontSize: 13,
              height: 1.5,
              letterSpacing: 1.6,
              color: c,
            ),
          ),
        ),
      ),
    );
  }
}

/// A rubber stamp that lands when it first appears (scale + slight
/// rotation settle), then stays. Respects "reduce motion".
class InkStamp extends StatefulWidget {
  const InkStamp({
    super.key,
    required this.text,
    this.date,
    this.color = AppColors.verified,
    this.size = 112,
    this.angle = -.16,
  });

  final String text;
  final String? date;
  final Color color;
  final double size;
  final double angle;

  @override
  State<InkStamp> createState() => _InkStampState();
}

class _InkStampState extends State<InkStamp> with SingleTickerProviderStateMixin {
  late final _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 780));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.maybeDisableAnimationsOf(context) ?? false) {
      _c.value = 1;
    } else if (_c.value == 0 && !_c.isAnimating) {
      _c.forward(); // the first third is a pause (see Interval below)
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final land = CurvedAnimation(
      parent: _c,
      curve: const Interval(.33, 1, curve: Curves.easeOutBack),
    );
    final appear = CurvedAnimation(
      parent: _c,
      curve: const Interval(.33, .6, curve: Curves.easeIn),
    );
    return AnimatedBuilder(
      animation: _c,
      builder: (context, child) {
        final t = land.value;
        return Opacity(
          opacity: appear.value,
          child: Transform.rotate(
            angle: widget.angle + (1 - t) * .25,
            child: Transform.scale(scale: 1.6 - .6 * t, child: child),
          ),
        );
      },
      child: SizedBox.square(
        dimension: widget.size,
        child: CustomPaint(
          painter: _StampRingPainter(widget.color),
          child: Center(
            child: Padding(
              padding: EdgeInsets.all(widget.size * .17),
              child: FittedBox(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      widget.text,
                      style: TextStyle(
                        fontFamily: AppFonts.display,
                        fontFamilyFallback: const [AppFonts.text],
                        fontWeight: FontWeight.w800,
                        fontSize: 18,
                        height: 1.3,
                        color: widget.color,
                      ),
                    ),
                    if (widget.date != null)
                      Text(
                        widget.date!,
                        textDirection: TextDirection.ltr,
                        style: TextStyle(
                          fontFamily: AppFonts.mrz,
                          fontSize: 10,
                          color: widget.color,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _StampRingPainter extends CustomPainter {
  const _StampRingPainter(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final r = size.shortestSide / 2;
    final p = Paint()
      ..style = PaintingStyle.stroke
      ..color = color.withValues(alpha: .9);
    canvas.drawCircle(c, r - 2, p..strokeWidth = 3);
    canvas.drawCircle(c, r - 8, p..strokeWidth = 1.2);
    // Small ticks between the rings, like a dated cancellation stamp.
    for (var i = 0; i < 36; i++) {
      final a = i * math.pi * 2 / 36;
      final d = Offset(math.cos(a), math.sin(a));
      canvas.drawLine(c + d * (r - 7), c + d * (r - 3.5), p..strokeWidth = 1);
    }
  }

  @override
  bool shouldRepaint(_StampRingPainter old) => old.color != color;
}
