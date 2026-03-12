(function () {
  var cfg = {
    name: "",
    prompt: "",
    api: "",
    color: "#c9a84c",
    greeting: "",
    position: "left",
    questions: [],
  };

  var script = document.currentScript;
  if (script) {
    cfg.name = script.getAttribute("data-name") || "AI Assistant";
    cfg.prompt = script.getAttribute("data-prompt") || "";
    cfg.api = script.getAttribute("data-api") || "";
    cfg.color = script.getAttribute("data-color") || "#c9a84c";
    cfg.greeting = script.getAttribute("data-greeting") || "Hi! How can I help you today?";
    cfg.position = script.getAttribute("data-position") || "left";
    var q = script.getAttribute("data-questions");
    cfg.questions = q ? q.split("|") : [];
  }

  if (!cfg.api) { console.warn("AI Widget: data-api is required."); return; }

  var messages = [];
  var isOpen = false;
  var isLoading = false;
  var posCSS = cfg.position === "left" ? "left:24px;" : "right:24px;";

  // --- Styles ---
  var style = document.createElement("style");
  style.textContent = [
    "#vdc-bubble{position:fixed;bottom:24px;" + posCSS + "z-index:99998;display:flex;align-items:center;gap:8px;background:#12161e;border:1px solid rgba(201,168,76,0.25);color:#c9a84c;padding:10px 18px;border-radius:50px;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;font-weight:600;box-shadow:0 4px 24px rgba(0,0,0,0.5);}",
    "#vdc-bubble:hover{background:#1a1f2b;border-color:rgba(201,168,76,0.45);}",
    "#vdc-bubble svg{width:18px;height:18px;fill:#c9a84c;}",
    "#vdc-panel{position:fixed;bottom:24px;" + posCSS + "z-index:99998;width:370px;height:510px;display:none;flex-direction:column;border-radius:14px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 8px 48px rgba(0,0,0,0.6);border:1px solid rgba(201,168,76,0.15);background:#0a0c10;}",
    "#vdc-panel-hdr{background:linear-gradient(135deg,#12161e,#1a1f2b);padding:14px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(201,168,76,0.12);}",
    "#vdc-panel-hdr .hdr-info{display:flex;align-items:center;gap:10px;}",
    "#vdc-panel-hdr .hdr-icon{width:32px;height:32px;border-radius:50%;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.2);display:flex;align-items:center;justify-content:center;font-size:14px;}",
    "#vdc-panel-hdr .hdr-name{font-size:14px;font-weight:700;color:#f0f1f4;}",
    "#vdc-panel-hdr .hdr-sub{font-size:11px;color:#8b93a7;}",
    "#vdc-panel-close{background:none;border:none;color:#555e73;font-size:18px;cursor:pointer;padding:4px;line-height:1;}",
    "#vdc-panel-close:hover{color:#f0f1f4;}",
    "#vdc-msgs{flex:1;overflow-y:auto;padding:14px 16px;background:#0a0c10;}",
    "#vdc-msgs::-webkit-scrollbar{width:4px;}",
    "#vdc-msgs::-webkit-scrollbar-track{background:transparent;}",
    "#vdc-msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px;}",
    ".vdc-msg{margin-bottom:10px;display:flex;}",
    ".vdc-msg.user{justify-content:flex-end;}",
    ".vdc-msg .bubble{max-width:82%;border-radius:10px;padding:9px 13px;font-size:13px;line-height:1.55;white-space:pre-wrap;word-break:break-word;}",
    ".vdc-msg.bot .bubble{background:#12161e;color:#f0f1f4;border:1px solid rgba(255,255,255,0.04);}",
    ".vdc-msg.user .bubble{background:rgba(201,168,76,0.12);color:#e2c36b;border:1px solid rgba(201,168,76,0.15);}",
    ".vdc-msg.typing .bubble{color:#555e73;}",
    "#vdc-quick{display:flex;gap:6px;padding:0 16px 8px;overflow-x:auto;background:#0a0c10;}",
    "#vdc-quick::-webkit-scrollbar{display:none;}",
    "#vdc-quick button{flex-shrink:0;background:none;border:1px solid rgba(201,168,76,0.15);color:#c9a84c;border-radius:20px;padding:5px 14px;font-size:11px;cursor:pointer;font-family:inherit;white-space:nowrap;}",
    "#vdc-quick button:hover{background:rgba(201,168,76,0.08);border-color:rgba(201,168,76,0.3);}",
    "#vdc-input-area{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(255,255,255,0.06);background:#0a0c10;}",
    "#vdc-input{flex:1;border:1px solid rgba(255,255,255,0.08);background:#12161e;color:#f0f1f4;border-radius:8px;padding:10px 12px;font-size:13px;outline:none;font-family:inherit;}",
    "#vdc-input:focus{border-color:rgba(201,168,76,0.35);}",
    "#vdc-input::placeholder{color:#555e73;}",
    "#vdc-send{background:#c9a84c;color:#000;border:none;border-radius:8px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;}",
    "#vdc-send:hover{background:#e2c36b;}",
    "@media(max-width:420px){#vdc-panel{width:calc(100vw - 16px);left:8px;right:8px;bottom:8px;height:70vh;}}",
  ].join("\n");
  document.head.appendChild(style);

  // --- Bubble ---
  var bubble = document.createElement("div");
  bubble.id = "vdc-bubble";
  bubble.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg> Ask VDC AI';
  bubble.onclick = function () {
    isOpen = true;
    bubble.style.display = "none";
    panel.style.display = "flex";
    inputEl.focus();
  };
  document.body.appendChild(bubble);

  // --- Panel ---
  var panel = document.createElement("div");
  panel.id = "vdc-panel";

  var header = document.createElement("div");
  header.id = "vdc-panel-hdr";
  header.innerHTML = '<div class="hdr-info"><div class="hdr-icon">&#9670;</div><div><div class="hdr-name">' + esc(cfg.name) + '</div><div class="hdr-sub">Investment AI Assistant</div></div></div>';
  var closeBtn = document.createElement("button");
  closeBtn.id = "vdc-panel-close";
  closeBtn.innerHTML = "&#10005;";
  closeBtn.onclick = function () {
    isOpen = false;
    panel.style.display = "none";
    bubble.style.display = "flex";
  };
  header.appendChild(closeBtn);
  panel.appendChild(header);

  var msgsEl = document.createElement("div");
  msgsEl.id = "vdc-msgs";
  panel.appendChild(msgsEl);

  var quickEl = document.createElement("div");
  quickEl.id = "vdc-quick";
  panel.appendChild(quickEl);

  var inputArea = document.createElement("form");
  inputArea.id = "vdc-input-area";
  var inputEl = document.createElement("input");
  inputEl.id = "vdc-input";
  inputEl.placeholder = "Ask about deals, the portfolio, investing...";
  var sendBtn = document.createElement("button");
  sendBtn.id = "vdc-send";
  sendBtn.type = "submit";
  sendBtn.textContent = "Send";
  inputArea.appendChild(inputEl);
  inputArea.appendChild(sendBtn);
  inputArea.onsubmit = function (e) { e.preventDefault(); sendMessage(inputEl.value.trim()); };
  panel.appendChild(inputArea);
  document.body.appendChild(panel);

  renderMessages();

  function sendMessage(text) {
    if (!text || isLoading) return;
    inputEl.value = "";
    messages.push({ role: "user", content: text });
    isLoading = true;
    renderMessages();

    fetch(cfg.api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemPrompt: cfg.prompt, messages: messages }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("API error");
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var content = "";
        messages.push({ role: "assistant", content: "" });

        function read() {
          reader.read().then(function (result) {
            if (result.done) { isLoading = false; renderMessages(); return; }
            var lines = decoder.decode(result.value, { stream: true }).split("\n");
            for (var i = 0; i < lines.length; i++) {
              if (lines[i].indexOf("data: ") === 0) {
                var d = lines[i].slice(6);
                if (d === "[DONE]") continue;
                try {
                  var parsed = JSON.parse(d);
                  var delta = parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content;
                  if (delta) {
                    content += delta;
                    messages[messages.length - 1].content = content;
                    renderMessages();
                  }
                } catch (e) {}
              }
            }
            read();
          });
        }
        read();
      })
      .catch(function () {
        messages.push({ role: "assistant", content: "Sorry, something went wrong. Please try again or contact vincedang@nestinghomesolution.com directly." });
        isLoading = false;
        renderMessages();
      });
  }

  function renderMessages() {
    var html = "";
    if (messages.length === 0) {
      html += '<div class="vdc-msg bot"><div class="bubble">' + esc(cfg.greeting) + "</div></div>";
    }
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      var cls = m.role === "user" ? "user" : "bot";
      html += '<div class="vdc-msg ' + cls + '"><div class="bubble">' + esc(m.content) + "</div></div>";
    }
    if (isLoading && messages.length && messages[messages.length - 1].role !== "assistant") {
      html += '<div class="vdc-msg bot typing"><div class="bubble">Thinking...</div></div>';
    }
    msgsEl.innerHTML = html;
    msgsEl.scrollTop = msgsEl.scrollHeight;

    quickEl.innerHTML = "";
    if (messages.length === 0 && cfg.questions.length > 0) {
      for (var j = 0; j < cfg.questions.length; j++) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = cfg.questions[j];
        (function (q) { btn.onclick = function () { sendMessage(q); }; })(cfg.questions[j]);
        quickEl.appendChild(btn);
      }
    }
  }

  function esc(s) {
    if (!s) return "";
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }
})();
