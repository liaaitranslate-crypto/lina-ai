import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

const String linaApi = 'http://localhost:3000';

void main() {
  runApp(const LinaApp());
}

// ============================================================
// LINA APP
// ============================================================

class LinaApp extends StatelessWidget {
  const LinaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Lina AI',
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: 'Arial',
        scaffoldBackgroundColor: const Color(0xFFF7F8FC),
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF6557E8),
          brightness: Brightness.light,
        ),
      ),
      home: const LinaHome(),
    );
  }
}

// ============================================================
// MAIN APP
// ============================================================

class LinaHome extends StatefulWidget {
  const LinaHome({super.key});

  @override
  State<LinaHome> createState() => _LinaHomeState();
}

class _LinaHomeState extends State<LinaHome> {
  int selected = 0;

  final List<Widget> pages = const [
    HomePage(),
    ChatPage(),
    ToolsPage(),
    ProfilePage(),
  ];

  String? pendingChatMessage;

  void openPage(int index) {
    setState(() {
      selected = index;
    });
  }

  void openChatWithMessage(String message) {
    setState(() {
      pendingChatMessage = message;
      selected = 1;
    });
  }

  String? takePendingMessage() {
    final message = pendingChatMessage;
    pendingChatMessage = null;
    return message;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          _buildSidebar(),
          Expanded(
            child: IndexedStack(
              index: selected,
              children: pages,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSidebar() {
    return Container(
      width: 215,
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          right: BorderSide(
            color: Color(0xFFE8E8EF),
          ),
        ),
      ),
      child: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 22),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    gradient: const LinearGradient(
                      colors: [
                        Color(0xFF7D70FF),
                        Color(0xFF5A4BE5),
                      ],
                    ),
                  ),
                  child: const Icon(
                    Icons.auto_awesome_rounded,
                    color: Colors.white,
                    size: 21,
                  ),
                ),
                const SizedBox(width: 10),
                const Text(
                  'Lina',
                  style: TextStyle(
                    fontSize: 23,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 38),
            _navItem(Icons.home_rounded, 'Home', 0),
            _navItem(
              Icons.chat_bubble_outline_rounded,
              'Chat',
              1,
            ),
            _navItem(
              Icons.grid_view_rounded,
              'Tools',
              2,
            ),
            const Spacer(),
            _navItem(
              Icons.person_outline_rounded,
              'Profile',
              3,
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _navItem(
    IconData icon,
    String title,
    int index,
  ) {
    final bool active = selected == index;

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: 13,
        vertical: 4,
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(13),
        onTap: () {
          openPage(index);
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 12,
          ),
          decoration: BoxDecoration(
            color: active
                ? const Color(0xFFF0EEFF)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(13),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                size: 20,
                color: active
                    ? const Color(0xFF5F50DD)
                    : const Color(0xFF777985),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: active
                      ? FontWeight.w700
                      : FontWeight.w500,
                  color: active
                      ? const Color(0xFF5546D7)
                      : const Color(0xFF666873),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================
// HOME
// ============================================================

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final TextEditingController controller =
      TextEditingController();

  bool loading = false;

  void goToChat() {
    final String text = controller.text.trim();

    if (text.isEmpty || loading) return;

    final state =
        context.findAncestorStateOfType<_LinaHomeState>();

    if (state == null) return;

    controller.clear();
    state.openChatWithMessage(text);
  }

  void openTools(int tool) {
    final state =
        context.findAncestorStateOfType<_LinaHomeState>();

    if (state == null) return;

    state.openPage(2);

    Future.delayed(
      const Duration(milliseconds: 80),
      () {
        ToolsPageController.instance?.openTool(tool);
      },
    );
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(40),
        child: ConstrainedBox(
          constraints: const BoxConstraints(
            maxWidth: 900,
          ),
          child: Column(
            children: [
              const SizedBox(height: 40),
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  gradient: const LinearGradient(
                    colors: [
                      Color(0xFF7B6DFF),
                      Color(0xFF5C4CE8),
                    ],
                  ),
                ),
                child: const Icon(
                  Icons.auto_awesome_rounded,
                  color: Colors.white,
                  size: 31,
                ),
              ),
              const SizedBox(height: 22),
              const Text(
                'Hello, I’m Lina ✨',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 34,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -1,
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                'Your intelligent AI assistant for everyday work.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  color: Color(0xFF777985),
                ),
              ),
              const SizedBox(height: 35),
              _homeInput(),
              const SizedBox(height: 28),
              Row(
                children: [
                  Expanded(
                    child: ToolPreview(
                      icon: Icons.chat_bubble_outline_rounded,
                      title: 'Chat',
                      subtitle: 'Talk with Lina',
                      onTap: () {
                        final state =
                            context.findAncestorStateOfType<
                                _LinaHomeState>();

                        state?.openPage(1);
                      },
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: ToolPreview(
                      icon: Icons.translate_rounded,
                      title: 'Translate',
                      subtitle: 'Translate text',
                      onTap: () {
                        openTools(0);
                      },
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: ToolPreview(
                      icon: Icons.edit_note_rounded,
                      title: 'Rewrite',
                      subtitle: 'Improve your text',
                      onTap: () {
                        openTools(1);
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _homeInput() {
    return Container(
      constraints: const BoxConstraints(
        maxWidth: 760,
      ),
      padding: const EdgeInsets.all(7),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: const Color(0xFFE7E7EE),
        ),
        boxShadow: const [
          BoxShadow(
            blurRadius: 25,
            offset: Offset(0, 8),
            color: Color(0x0D000000),
          ),
        ],
      ),
      child: Row(
        children: [
          const SizedBox(width: 12),
          const Icon(
            Icons.auto_awesome_rounded,
            color: Color(0xFF6A5AE8),
            size: 21,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: controller,
              onSubmitted: (_) {
                goToChat();
              },
              decoration: const InputDecoration(
                hintText: 'Ask Lina anything...',
                border: InputBorder.none,
              ),
            ),
          ),
          IconButton(
            onPressed: loading ? null : goToChat,
            style: IconButton.styleFrom(
              backgroundColor: const Color(0xFF6254E7),
              foregroundColor: Colors.white,
            ),
            icon: const Icon(
              Icons.arrow_upward_rounded,
            ),
          ),
        ],
      ),
    );
  }
}

// ============================================================
// TOOL PREVIEW
// ============================================================

class ToolPreview extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  const ToolPreview({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(17),
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(17),
            border: Border.all(
              color: const Color(0xFFE8E8EF),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: const Color(0xFFF2F0FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                  color: const Color(0xFF6254E7),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF858692),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ============================================================
// CHAT MESSAGE
// ============================================================

class ChatMessage {
  final String text;
  final bool isUser;

  const ChatMessage({
    required this.text,
    required this.isUser,
  });
}

// ============================================================
// CHAT
// ============================================================

class ChatPage extends StatefulWidget {
  const ChatPage({super.key});

  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final TextEditingController controller =
      TextEditingController();

  final ScrollController scrollController =
      ScrollController();

  final List<ChatMessage> messages = [];

  bool loading = false;

  static const int dailyLimit = 10;

  int messagesToday = 0;

  bool sendingFromHome = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();

    if (sendingFromHome) return;

    final state =
        context.findAncestorStateOfType<_LinaHomeState>();

    final String? pending =
        state?.takePendingMessage();

    if (pending != null && pending.trim().isNotEmpty) {
      sendingFromHome = true;

      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;

        controller.text = pending;
        sendMessage();

        sendingFromHome = false;
      });
    }
  }

  Future<void> sendMessage() async {
    final String text = controller.text.trim();

    if (text.isEmpty || loading) return;

    if (messagesToday >= dailyLimit) {
      _showLimitDialog();
      return;
    }

    // مهم:
    // تاریخچه را قبل از اضافه کردن پیام جدید می‌سازیم
    // تا پیام فعلی دوبار برای Backend ارسال نشود.
    final List<Map<String, String>> history =
        messages.map((message) {
      return {
        'role': message.isUser
            ? 'user'
            : 'assistant',
        'content': message.text,
      };
    }).toList();

    controller.clear();

    setState(() {
      messages.add(
        ChatMessage(
          text: text,
          isUser: true,
        ),
      );

      messagesToday++;
      loading = true;
    });

    _scrollDown();

    try {
      final http.Response response = await http.post(
        Uri.parse('$linaApi/api/chat'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'message': text,
          'history': history,
        }),
      );

      if (!mounted) return;

      dynamic data;

      try {
        data = jsonDecode(response.body);
      } catch (_) {
        data = null;
      }

      String answer;

      if (response.statusCode >= 200 &&
          response.statusCode < 300 &&
          data is Map &&
          data['success'] == true) {
        answer = (data['reply'] ?? '').toString().trim();

        if (answer.isEmpty) {
          answer = 'Lina did not return a response.';
        }
      } else {
        answer = _friendlyApiError(
          response.statusCode,
          data,
        );
      }

      setState(() {
        messages.add(
          ChatMessage(
            text: answer,
            isUser: false,
          ),
        );
      });
    } catch (_) {
      if (!mounted) return;

      setState(() {
        messages.add(
          const ChatMessage(
            text:
                'Lina could not connect to the AI service. Please make sure the Lina backend is running and try again.',
            isUser: false,
          ),
        );
      });
    }

    if (mounted) {
      setState(() {
        loading = false;
      });

      _scrollDown();
    }
  }

  String _friendlyApiError(
    int statusCode,
    dynamic data,
  ) {
    if (data is Map &&
        data['error'] != null &&
        data['error'].toString().trim().isNotEmpty) {
      return data['error'].toString();
    }

    if (statusCode == 401 || statusCode == 403) {
      return 'Lina could not access the AI service right now.';
    }

    if (statusCode == 429) {
      return 'Lina is receiving too many requests right now. Please try again in a moment.';
    }

    if (statusCode >= 500) {
      return 'Lina is temporarily unavailable. Please try again in a moment.';
    }

    return 'Lina could not answer right now. Please try again.';
  }

  void _showLimitDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Daily limit'),
          content: const Text(
            'You have used your 10 free messages for today.',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
              },
              child: const Text('OK'),
            ),
          ],
        );
      },
    );
  }

  void _scrollDown() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!scrollController.hasClients) return;

      scrollController.animateTo(
        scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    });
  }

  void clearChat() {
    if (loading) return;

    setState(() {
      messages.clear();
    });

    _showSnackBar('New chat started');
  }

  void _showSnackBar(String text) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(text),
        duration: const Duration(seconds: 1),
      ),
    );
  }

  void _copyMessage(String text) {
    Clipboard.setData(
      ClipboardData(text: text),
    );

    _showSnackBar('Copied');
  }

  @override
  void dispose() {
    controller.dispose();
    scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 820,
        height: MediaQuery.of(context).size.height - 40,
        margin: const EdgeInsets.symmetric(
          horizontal: 22,
          vertical: 20,
        ),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: const Color(0xFFE5E5EC),
          ),
          boxShadow: const [
            BoxShadow(
              blurRadius: 30,
              offset: Offset(0, 8),
              color: Color(0x0A000000),
            ),
          ],
        ),
        child: Column(
          children: [
            _header(),
            const Divider(
              height: 1,
              color: Color(0xFFEDEDF2),
            ),
            Expanded(
              child: messages.isEmpty
                  ? _emptyState()
                  : ListView.builder(
                      controller: scrollController,
                      padding: const EdgeInsets.fromLTRB(
                        28,
                        24,
                        28,
                        15,
                      ),
                      itemCount: messages.length,
                      itemBuilder: (context, index) {
                        return _message(
                          messages[index],
                        );
                      },
                    ),
            ),
            if (loading) _typing(),
            _input(),
          ],
        ),
      ),
    );
  }

  Widget _header() {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: 21,
        vertical: 14,
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFF0EEFF),
              borderRadius: BorderRadius.circular(13),
            ),
            child: const Icon(
              Icons.auto_awesome_rounded,
              color: Color(0xFF6254E7),
            ),
          ),
          const SizedBox(width: 11),
          const Column(
            crossAxisAlignment:
                CrossAxisAlignment.start,
            children: [
              Text(
                'Lina',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
              SizedBox(height: 2),
              Row(
                children: [
                  Icon(
                    Icons.circle,
                    size: 7,
                    color: Color(0xFF4CAF50),
                  ),
                  SizedBox(width: 5),
                  Text(
                    'Online',
                    style: TextStyle(
                      fontSize: 11,
                      color: Color(0xFF777985),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const Spacer(),
          Text(
            '$messagesToday/$dailyLimit',
            style: const TextStyle(
              fontSize: 12,
              color: Color(0xFF858692),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            tooltip: 'New chat',
            onPressed: loading ? null : clearChat,
            icon: const Icon(
              Icons.add_comment_outlined,
              size: 20,
            ),
          ),
        ],
      ),
    );
  }

  Widget _emptyState() {
    return Center(
      child: Column(
        mainAxisAlignment:
            MainAxisAlignment.center,
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: const Color(0xFFF1EFFF),
              borderRadius: BorderRadius.circular(18),
            ),
            child: const Icon(
              Icons.auto_awesome_rounded,
              size: 27,
              color: Color(0xFF6254E7),
            ),
          ),
          const SizedBox(height: 17),
          const Text(
            'How can I help?',
            style: TextStyle(
              fontSize: 21,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 7),
          const Text(
            'Ask Lina anything.',
            style: TextStyle(
              fontSize: 13,
              color: Color(0xFF858692),
            ),
          ),
        ],
      ),
    );
  }

  Widget _message(ChatMessage message) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 17),
      child: Row(
        mainAxisAlignment: message.isUser
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          if (!message.isUser)
            Container(
              width: 30,
              height: 30,
              margin: const EdgeInsets.only(right: 9),
              decoration: BoxDecoration(
                color: const Color(0xFFF0EEFF),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.auto_awesome_rounded,
                size: 15,
                color: Color(0xFF6254E7),
              ),
            ),
          Flexible(
            child: Container(
              constraints: const BoxConstraints(
                maxWidth: 600,
              ),
              padding: const EdgeInsets.symmetric(
                horizontal: 15,
                vertical: 11,
              ),
              decoration: BoxDecoration(
                color: message.isUser
                    ? const Color(0xFFF4F4F6)
                    : Colors.white,
                borderRadius: BorderRadius.circular(15),
                border: Border.all(
                  color: const Color(0xFFE5E5EA),
                ),
              ),
              child: Column(
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  SelectableText(
                    message.text,
                    style: const TextStyle(
                      fontSize: 14,
                      height: 1.55,
                      color: Color(0xFF252631),
                    ),
                  ),
                  if (!message.isUser)
                    Align(
                      alignment: Alignment.bottomRight,
                      child: IconButton(
                        visualDensity:
                            VisualDensity.compact,
                        tooltip: 'Copy',
                        onPressed: () {
                          _copyMessage(
                            message.text,
                          );
                        },
                        icon: const Icon(
                          Icons.copy_outlined,
                          size: 16,
                          color: Color(0xFF8A8B95),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _typing() {
    return const Padding(
      padding: EdgeInsets.only(
        left: 30,
        bottom: 9,
      ),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          'Lina is thinking...',
          style: TextStyle(
            fontSize: 12,
            color: Color(0xFF858692),
          ),
        ),
      ),
    );
  }

  Widget _input() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        17,
        7,
        17,
        17,
      ),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: 7,
          vertical: 5,
        ),
        decoration: BoxDecoration(
          color: const Color(0xFFF8F8FA),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: const Color(0xFFE3E3E9),
          ),
        ),
        child: Row(
          children: [
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: controller,
                minLines: 1,
                maxLines: 4,
                onSubmitted: (_) {
                  sendMessage();
                },
                decoration: const InputDecoration(
                  hintText: 'Message Lina...',
                  border: InputBorder.none,
                ),
              ),
            ),
            IconButton(
              onPressed:
                  loading ? null : sendMessage,
              style: IconButton.styleFrom(
                backgroundColor: const Color(0xFF6254E7),
                foregroundColor: Colors.white,
              ),
              icon: const Icon(
                Icons.arrow_upward_rounded,
                size: 19,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================
// TOOLS
// ============================================================

class ToolsPageController {
  static _ToolsPageState? instance;
}

class ToolsPage extends StatefulWidget {
  const ToolsPage({super.key});

  @override
  State<ToolsPage> createState() => _ToolsPageState();
}

class _ToolsPageState extends State<ToolsPage> {
  int tool = 0;

  @override
  void initState() {
    super.initState();
    ToolsPageController.instance = this;
  }

  void openTool(int index) {
    if (!mounted) return;

    setState(() {
      tool = index;
    });
  }

  @override
  void dispose() {
    if (ToolsPageController.instance == this) {
      ToolsPageController.instance = null;
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Row(
        crossAxisAlignment:
            CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 210,
            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment.start,
              children: [
                const Text(
                  'Tools',
                  style: TextStyle(
                    fontSize: 27,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 7),
                const Text(
                  'Powerful AI tools',
                  style: TextStyle(
                    color: Color(0xFF858692),
                  ),
                ),
                const SizedBox(height: 24),
                _toolButton(
                  Icons.translate_rounded,
                  'Translate',
                  0,
                ),
                _toolButton(
                  Icons.edit_note_rounded,
                  'Rewrite',
                  1,
                ),
                _toolButton(
                  Icons.code_rounded,
                  'Code',
                  2,
                ),
              ],
            ),
          ),
          const SizedBox(width: 28),
          Expanded(
            child: _content(),
          ),
        ],
      ),
    );
  }

  Widget _toolButton(
    IconData icon,
    String title,
    int index,
  ) {
    final bool active = tool == index;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(13),
          onTap: () {
            openTool(index);
          },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: active
                  ? const Color(0xFFF0EEFF)
                  : Colors.white,
              borderRadius: BorderRadius.circular(13),
              border: Border.all(
                color: active
                    ? const Color(0xFFD9D4FF)
                    : const Color(0xFFE7E7EC),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 20,
                  color: active
                      ? const Color(0xFF6254E7)
                      : const Color(0xFF777985),
                ),
                const SizedBox(width: 11),
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: active
                        ? FontWeight.w700
                        : FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _content() {
    if (tool == 0) {
      return const TranslatorTool();
    }

    if (tool == 1) {
      return const SimpleAiTool(
        title: 'Rewrite',
        icon: Icons.edit_note_rounded,
        hint: 'Paste text you want Lina to rewrite...',
        mode: 'rewrite',
      );
    }

    return const SimpleAiTool(
      title: 'Code',
      icon: Icons.code_rounded,
      hint: 'Describe the code you need...',
      mode: 'code',
    );
  }
}

// ============================================================
// TRANSLATOR
// ============================================================

class TranslatorTool extends StatefulWidget {
  const TranslatorTool({super.key});

  @override
  State<TranslatorTool> createState() =>
      _TranslatorToolState();
}

class _TranslatorToolState extends State<TranslatorTool> {
  final TextEditingController input =
      TextEditingController();

  String source = 'auto';
  String target = 'fa';

  String result = '';

  bool loading = false;

  Future<void> translate() async {
    final String text = input.text.trim();

    if (text.isEmpty || loading) return;

    FocusScope.of(context).unfocus();

    setState(() {
      loading = true;
      result = '';
    });

    try {
      final http.Response response = await http.post(
        Uri.parse('$linaApi/api/translate'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'text': text,
          'source': source,
          'target': target,
        }),
      );

      dynamic data;

      try {
        data = jsonDecode(response.body);
      } catch (_) {
        data = null;
      }

      if (!mounted) return;

      if (response.statusCode >= 200 &&
          response.statusCode < 300 &&
          data is Map &&
          data['success'] == true) {
        setState(() {
          result =
              (data['translation'] ?? '').toString();
        });
      } else {
        setState(() {
          result = _translationError(
            response.statusCode,
            data,
          );
        });
      }
    } catch (_) {
      if (!mounted) return;

      setState(() {
        result =
            'Could not connect to Lina translation service. Please make sure the Lina backend is running.';
      });
    }

    if (mounted) {
      setState(() {
        loading = false;
      });
    }
  }

  String _translationError(
    int statusCode,
    dynamic data,
  ) {
    if (data is Map &&
        data['error'] != null &&
        data['error'].toString().trim().isNotEmpty) {
      return data['error'].toString();
    }

    if (statusCode >= 500) {
      return 'Lina translation service is temporarily unavailable.';
    }

    return 'Translation could not be completed. Please try again.';
  }

  void swapLanguages() {
    if (source == 'auto') return;

    setState(() {
      final String oldSource = source;
      source = target;
      target = oldSource;
    });
  }

  void clear() {
    setState(() {
      input.clear();
      result = '';
    });
  }

  @override
  void dispose() {
    input.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFFE5E5EC),
        ),
      ),
      child: Column(
        children: [
          _title(),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: _languageBox(
                  label: 'From',
                  value: source,
                  items: const [
                    DropdownMenuItem<String>(
                      value: 'auto',
                      child: Text('Auto detect'),
                    ),
                    DropdownMenuItem<String>(
                      value: 'en',
                      child: Text('English'),
                    ),
                    DropdownMenuItem<String>(
                      value: 'fa',
                      child: Text('Persian'),
                    ),
                    DropdownMenuItem<String>(
                      value: 'ar',
                      child: Text('Arabic'),
                    ),
                    DropdownMenuItem<String>(
                      value: 'ur',
                      child: Text('Urdu'),
                    ),
                  ],
                  onChanged: (String? value) {
                    if (value == null) return;

                    setState(() {
                      source = value;
                    });
                  },
                ),
              ),
              const SizedBox(width: 10),
              IconButton(
                tooltip: 'Swap languages',
                onPressed: swapLanguages,
                icon: const Icon(
                  Icons.swap_horiz_rounded,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _languageBox(
                  label: 'To',
                  value: target,
                  items: const [
                    DropdownMenuItem<String>(
                      value: 'fa',
                      child: Text('Persian'),
                    ),
                    DropdownMenuItem<String>(
                      value: 'en',
                      child: Text('English'),
                    ),
                    DropdownMenuItem<String>(
                      value: 'ar',
                      child: Text('Arabic'),
                    ),
                    DropdownMenuItem<String>(
                      value: 'ur',
                      child: Text('Urdu'),
                    ),
                  ],
                  onChanged: (String? value) {
                    if (value == null) return;

                    setState(() {
                      target = value;
                    });
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 17),
          Expanded(
            child: Row(
              crossAxisAlignment:
                  CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: _textArea(
                    controller: input,
                    hint: 'Enter text to translate...',
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF9F9FB),
                      borderRadius:
                          BorderRadius.circular(15),
                      border: Border.all(
                        color: const Color(0xFFE6E6EC),
                      ),
                    ),
                    child: result.isEmpty
                        ? const Text(
                            'Translation will appear here...',
                            style: TextStyle(
                              fontSize: 14,
                              height: 1.6,
                              color: Color(0xFF999AA4),
                            ),
                          )
                        : SingleChildScrollView(
                            child: SelectableText(
                              result,
                              style: const TextStyle(
                                fontSize: 14,
                                height: 1.6,
                                color: Color(0xFF252631),
                              ),
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment:
                MainAxisAlignment.end,
            children: [
              if (result.isNotEmpty)
                IconButton(
                  tooltip: 'Copy translation',
                  onPressed: () {
                    Clipboard.setData(
                      ClipboardData(text: result),
                    );

                    ScaffoldMessenger.of(context)
                        .showSnackBar(
                      const SnackBar(
                        content: Text(
                          'Translation copied',
                        ),
                        duration:
                            Duration(seconds: 1),
                      ),
                    );
                  },
                  icon: const Icon(
                    Icons.copy_outlined,
                  ),
                ),
              if (input.text.isNotEmpty)
                IconButton(
                  tooltip: 'Clear',
                  onPressed: clear,
                  icon: const Icon(
                    Icons.close_rounded,
                  ),
                ),
              const SizedBox(width: 8),
              FilledButton.icon(
                onPressed:
                    loading ? null : translate,
                icon: loading
                    ? const SizedBox(
                        width: 17,
                        height: 17,
                        child:
                            CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(
                        Icons.translate_rounded,
                      ),
                label: const Text('Translate'),
                style: FilledButton.styleFrom(
                  backgroundColor:
                      const Color(0xFF6254E7),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _title() {
    return Row(
      children: [
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: const Color(0xFFF0EEFF),
            borderRadius: BorderRadius.circular(13),
          ),
          child: const Icon(
            Icons.translate_rounded,
            color: Color(0xFF6254E7),
          ),
        ),
        const SizedBox(width: 12),
        const Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            Text(
              'Translate',
              style: TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w800,
              ),
            ),
            SizedBox(height: 2),
            Text(
              'Translate your text with Lina',
              style: TextStyle(
                fontSize: 11,
                color: Color(0xFF858692),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _languageBox({
    required String label,
    required String value,
    required List<DropdownMenuItem<String>> items,
    required ValueChanged<String?> onChanged,
  }) {
    return Column(
      crossAxisAlignment:
          CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Color(0xFF777985),
          ),
        ),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          initialValue: value,
          items: items,
          onChanged: onChanged,
          decoration: InputDecoration(
            filled: true,
            fillColor: const Color(0xFFF9F9FB),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(
                color: Color(0xFFE6E6EC),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _textArea({
    required TextEditingController controller,
    required String hint,
  }) {
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: const Color(0xFFF9F9FB),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(
          color: const Color(0xFFE6E6EC),
        ),
      ),
      child: TextField(
        controller: controller,
        expands: true,
        maxLines: null,
        minLines: null,
        textAlignVertical:
            TextAlignVertical.top,
        decoration: InputDecoration(
          hintText: hint,
          border: InputBorder.none,
        ),
      ),
    );
  }
}

// ============================================================
// REWRITE + CODE
// ============================================================

class SimpleAiTool extends StatefulWidget {
  final String title;
  final IconData icon;
  final String hint;
  final String mode;

  const SimpleAiTool({
    super.key,
    required this.title,
    required this.icon,
    required this.hint,
    required this.mode,
  });

  @override
  State<SimpleAiTool> createState() =>
      _SimpleAiToolState();
}

class _SimpleAiToolState extends State<SimpleAiTool> {
  final TextEditingController input =
      TextEditingController();

  String result = '';

  bool loading = false;

  Future<void> run() async {
    final String text = input.text.trim();

    if (text.isEmpty || loading) return;

    FocusScope.of(context).unfocus();

    setState(() {
      loading = true;
      result = '';
    });

    try {
      late final http.Response response;

      // ======================================================
      // REWRITE
      // ======================================================

      if (widget.mode == 'rewrite') {
        response = await http.post(
          Uri.parse('$linaApi/api/rewrite'),
          headers: {
            'Content-Type': 'application/json',
          },
          body: jsonEncode({
            'text': text,
          }),
        );
      }

      // ======================================================
      // CODE
      // ======================================================

      else {
        final String prompt = '''
You are Lina, an expert software developer.

The user wants help with the following programming request.

Provide the complete useful code.
Use the appropriate programming language.
Make the code clean and ready to use.
If necessary, briefly explain how to use it.

REQUEST:
$text
''';

        response = await http.post(
          Uri.parse('$linaApi/api/chat'),
          headers: {
            'Content-Type': 'application/json',
          },
          body: jsonEncode({
            'message': prompt,
          }),
        );
      }

      dynamic data;

      try {
        data = jsonDecode(response.body);
      } catch (_) {
        data = null;
      }

      if (!mounted) return;

      if (response.statusCode >= 200 &&
          response.statusCode < 300 &&
          data is Map &&
          data['success'] == true) {
        setState(() {
          if (widget.mode == 'rewrite') {
            result =
                (data['result'] ?? '').toString();
          } else {
            result =
                (data['reply'] ?? '').toString();
          }
        });
      } else {
        setState(() {
          result = _toolError(
            response.statusCode,
            data,
          );
        });
      }
    } catch (_) {
      if (!mounted) return;

      setState(() {
        if (widget.mode == 'rewrite') {
          result =
              'Could not connect to Lina Rewrite. Please make sure the Lina backend is running.';
        } else {
          result =
              'Could not connect to Lina Code. Please make sure the Lina backend is running.';
        }
      });
    }

    if (mounted) {
      setState(() {
        loading = false;
      });
    }
  }

  String _toolError(
    int statusCode,
    dynamic data,
  ) {
    if (data is Map &&
        data['error'] != null &&
        data['error'].toString().trim().isNotEmpty) {
      return data['error'].toString();
    }

    if (statusCode >= 500) {
      return 'Lina is temporarily unavailable. Please try again.';
    }

    return 'The request could not be completed. Please try again.';
  }

  void clear() {
    setState(() {
      input.clear();
      result = '';
    });
  }

  void copyResult() {
    Clipboard.setData(
      ClipboardData(text: result),
    );

    ScaffoldMessenger.of(context)
        .showSnackBar(
      const SnackBar(
        content: Text('Copied'),
        duration: Duration(seconds: 1),
      ),
    );
  }

  @override
  void dispose() {
    input.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFFE5E5EC),
        ),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: const Color(0xFFF0EEFF),
                  borderRadius:
                      BorderRadius.circular(13),
                ),
                child: Icon(
                  widget.icon,
                  color: const Color(0xFF6254E7),
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.title,
                    style: const TextStyle(
                      fontSize: 19,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    widget.mode == 'rewrite'
                        ? 'Improve your writing with Lina'
                        : 'Build code with Lina',
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF858692),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          Expanded(
            child: Row(
              crossAxisAlignment:
                  CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: _box(
                    controller: input,
                    hint: widget.hint,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF9F9FB),
                      borderRadius:
                          BorderRadius.circular(15),
                      border: Border.all(
                        color: const Color(0xFFE6E6EC),
                      ),
                    ),
                    child: result.isEmpty
                        ? const Text(
                            'Lina result will appear here...',
                            style: TextStyle(
                              fontSize: 14,
                              height: 1.6,
                              color: Color(0xFF999AA4),
                            ),
                          )
                        : SingleChildScrollView(
                            child: SelectableText(
                              result,
                              style: const TextStyle(
                                fontSize: 14,
                                height: 1.6,
                                color: Color(0xFF252631),
                              ),
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment:
                MainAxisAlignment.end,
            children: [
              if (result.isNotEmpty)
                IconButton(
                  tooltip: 'Copy',
                  onPressed: copyResult,
                  icon: const Icon(
                    Icons.copy_outlined,
                  ),
                ),
              if (input.text.isNotEmpty)
                IconButton(
                  tooltip: 'Clear',
                  onPressed: clear,
                  icon: const Icon(
                    Icons.close_rounded,
                  ),
                ),
              const SizedBox(width: 8),
              FilledButton.icon(
                onPressed:
                    loading ? null : run,
                icon: loading
                    ? const SizedBox(
                        width: 17,
                        height: 17,
                        child:
                            CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Icon(widget.icon),
                label: Text(widget.title),
                style: FilledButton.styleFrom(
                  backgroundColor:
                      const Color(0xFF6254E7),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _box({
    required TextEditingController controller,
    required String hint,
  }) {
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: const Color(0xFFF9F9FB),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(
          color: const Color(0xFFE6E6EC),
        ),
      ),
      child: TextField(
        controller: controller,
        expands: true,
        maxLines: null,
        minLines: null,
        textAlignVertical:
            TextAlignVertical.top,
        decoration: InputDecoration(
          hintText: hint,
          border: InputBorder.none,
        ),
      ),
    );
  }
}

// ============================================================
// PROFILE
// ============================================================

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(25),
        child: Container(
          width: 600,
          padding: const EdgeInsets.all(35),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: const Color(0xFFE6E6ED),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 70,
                height: 70,
                decoration: BoxDecoration(
                  color: const Color(0xFFF0EEFF),
                  borderRadius:
                      BorderRadius.circular(22),
                ),
                child: const Icon(
                  Icons.person_outline_rounded,
                  size: 34,
                  color: Color(0xFF6254E7),
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                'Lina Profile',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 7),
              const Text(
                'Your Lina AI account',
                style: TextStyle(
                  color: Color(0xFF858692),
                ),
              ),
              const SizedBox(height: 25),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(15),
                decoration: BoxDecoration(
                  color: const Color(0xFFF9F9FB),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: const Color(0xFFE8E8EE),
                  ),
                ),
                child: const Row(
                  children: [
                    Icon(
                      Icons.auto_awesome_rounded,
                      color: Color(0xFF6254E7),
                    ),
                    SizedBox(width: 11),
                    Expanded(
                      child: Text(
                        'Lina AI Assistant',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Text(
                      'Version 1',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF858692),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}