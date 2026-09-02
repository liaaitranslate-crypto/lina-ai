import 'dart:async';

enum TranslationLanguage {
  auto,
  english,
  arabic,
  urdu,
}

extension TranslationLanguageLabel on TranslationLanguage {
  String get label {
    switch (this) {
      case TranslationLanguage.auto:
        return 'تشخیص خودکار';
      case TranslationLanguage.english:
        return 'انگلیسی';
      case TranslationLanguage.arabic:
        return 'عربی';
      case TranslationLanguage.urdu:
        return 'اردو';
    }
  }
}

abstract class TranslationService {
  Future<String> translateToPersian(
    String text,
    TranslationLanguage sourceLanguage,
  );
}

class LinaTranslationService implements TranslationService {
  static const int maxChunkLength = 1500;

  @override
  Future<String> translateToPersian(
    String text,
    TranslationLanguage sourceLanguage,
  ) async {
    final cleanText = text.trim();

    if (cleanText.isEmpty) {
      return '';
    }

    final chunks = _splitText(
      cleanText,
      maxChunkLength,
    );

    final results = <String>[];

    for (final chunk in chunks) {
      final result = await _translateChunk(
        chunk,
        sourceLanguage,
      );

      results.add(result);
    }

    return results.join('\n\n');
  }

  Future<String> _translateChunk(
    String text,
    TranslationLanguage sourceLanguage,
  ) async {
    await Future.delayed(
      const Duration(milliseconds: 300),
    );

    final lower = text.toLowerCase();

    if (sourceLanguage == TranslationLanguage.english ||
        sourceLanguage == TranslationLanguage.auto) {
      if (lower == 'hello') {
        return 'سلام';
      }

      if (lower == 'hi') {
        return 'سلام';
      }

      if (lower.contains('hello')) {
        return text.replaceAll(
          RegExp(
            'hello',
            caseSensitive: false,
          ),
          'سلام',
        );
      }

      if (lower.contains('how are you')) {
        return text.replaceAll(
          RegExp(
            'how are you',
            caseSensitive: false,
          ),
          'حالت چطور است',
        );
      }
    }

    return 'این بخش برای اتصال به سرویس ترجمه واقعی آماده است:\n\n$text';
  }

  List<String> _splitText(
    String text,
    int maxLength,
  ) {
    if (text.length <= maxLength) {
      return <String>[text];
    }

    final paragraphs = text.split(
      RegExp(r'\n\s*\n'),
    );

    final chunks = <String>[];
    var current = StringBuffer();

    for (final paragraph in paragraphs) {
      final part = paragraph.trim();

      if (part.isEmpty) {
        continue;
      }

      if (part.length > maxLength) {
        if (current.isNotEmpty) {
          chunks.add(
            current.toString().trim(),
          );
          current = StringBuffer();
        }

        chunks.addAll(
          _splitLongText(
            part,
            maxLength,
          ),
        );

        continue;
      }

      final extraLength =
          current.isEmpty ? part.length : part.length + 2;

      if (current.length + extraLength > maxLength) {
        if (current.isNotEmpty) {
          chunks.add(
            current.toString().trim(),
          );
        }

        current = StringBuffer();
      }

      if (current.isNotEmpty) {
        current.write('\n\n');
      }

      current.write(part);
    }

    if (current.isNotEmpty) {
      chunks.add(
        current.toString().trim(),
      );
    }

    return chunks;
  }

  List<String> _splitLongText(
    String text,
    int maxLength,
  ) {
    final chunks = <String>[];
    var start = 0;

    while (start < text.length) {
      var end = start + maxLength;

      if (end >= text.length) {
        end = text.length;
      } else {
        final lastSpace = text.lastIndexOf(
          ' ',
          end,
        );

        if (lastSpace > start) {
          end = lastSpace;
        }
      }

      final chunk = text
          .substring(start, end)
          .trim();

      if (chunk.isNotEmpty) {
        chunks.add(chunk);
      }

      start = end;

      while (start < text.length &&
          text[start].trim().isEmpty) {
        start++;
      }
    }

    return chunks;
  }
}