/**
 * CropSentry AI - FLOATING CHATBOT ASSISTANT
 * Features: Floating Action Button (FAB), Expandable Panel,
 * Multilingual agricultural query answering (EN, HI, MR), Quick Reply Chips
 */

document.addEventListener("DOMContentLoaded", () => {
    initChatbot();
});

function initChatbot() {
    // If chatbot container does not exist, inject floating widget automatically
    let chatbotWrap = document.getElementById("chatbotWidgetWrap");
    if (!chatbotWrap) {
        chatbotWrap = document.createElement("div");
        chatbotWrap.id = "chatbotWidgetWrap";
        chatbotWrap.innerHTML = `
            <!-- Floating FAB -->
            <button id="chatbotFab" class="chatbot-fab" aria-label="Open CropSentry AI Assistant">
                <span class="ping"></span>
                <svg class="icon icon-lg" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </button>

            <!-- Floating Chat Panel -->
            <div id="chatbotPanel" class="chatbot-panel" role="dialog" aria-label="CropSentry AI Assistant Chat">
                <div class="chat-header">
                    <h4>
                        <svg class="icon" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V17a1 1 0 0 1-2 0v-.07A7 7 0 1 1 19 12a1 1 0 0 1-2 0 5 5 0 1 0-4 4.93z"/></svg>
                        CropSentry AI Assistant
                    </h4>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <select id="chatLanguageSelect" style="background: rgba(255,255,255,0.2); color:white; border:none; border-radius:6px; padding:2px 6px; font-size:12px; outline:none; cursor:pointer;">
                            <option value="en" style="color:black;">EN</option>
                            <option value="hi" style="color:black;">हिंदी</option>
                            <option value="mr" style="color:black;">मराठी</option>
                        </select>
                        <button id="closeChatBtn" style="background:none; border:none; color:white; cursor:pointer; font-size:18px; line-height:1;">&times;</button>
                    </div>
                </div>

                <div class="chat-body" id="chatMessages" aria-live="polite">
                    <div class="chat-msg bot">
                        🌱 <strong>Welcome to CropSentry AI!</strong> I am your crop health assistant. Ask me about leaf diseases and model predictions.
                    </div>
                </div>

                <div class="chat-chips" id="chatChips">
                    <button class="chat-chip" onclick="sendQuickPrompt('What diseases can AI detect?')">🦠 Detectable Diseases</button>
                    <button class="chat-chip" onclick="sendQuickPrompt('How to treat Bacterial Blight?')">💊 Blight Treatment</button>
                    <button class="chat-chip" onclick="sendQuickPrompt('Is this tool free for farmers?')">🆓 Free Service?</button>
                </div>

                <form id="chatForm" class="chat-input-wrap">
                    <input type="text" id="chatInput" placeholder="Ask a crop question..." autocomplete="off" required>
                    <button type="submit" aria-label="Send Message">
                        <svg class="icon" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                </form>
            </div>
        `;
        document.body.appendChild(chatbotWrap);
    }

    const fab = document.getElementById("chatbotFab");
    const panel = document.getElementById("chatbotPanel");
    const closeBtn = document.getElementById("closeChatBtn");
    const form = document.getElementById("chatForm");
    const input = document.getElementById("chatInput");
    const messages = document.getElementById("chatMessages");
    const langSelect = document.getElementById("chatLanguageSelect");

    if (fab && panel) {
        fab.addEventListener("click", () => panel.classList.toggle("open"));
        if (closeBtn) closeBtn.addEventListener("click", () => panel.classList.remove("open"));
    }

    if (form && input && messages) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;

            // Append User message
            appendChatMessage(text, "user");
            input.value = "";

            // Show typing indicator
            const typingEl = document.createElement("div");
            typingEl.className = "chat-msg bot";
            typingEl.innerHTML = `<em>Thinking...</em>`;
            messages.appendChild(typingEl);
            messages.scrollTop = messages.scrollHeight;

            const selectedLang = langSelect ? langSelect.value : "en";

            setTimeout(() => {
                typingEl.remove();
                const botReply = generateAgriculturalResponse(text, selectedLang);
                appendChatMessage(botReply, "bot");
            }, 600);
        });
    }

    window.sendQuickPrompt = function(promptText) {
        if (input && form) {
            input.value = promptText;
            form.dispatchEvent(new Event("submit"));
        }
    };

    function appendChatMessage(text, sender) {
        const msg = document.createElement("div");
        msg.className = `chat-msg ${sender}`;
        msg.innerHTML = text;
        messages.appendChild(msg);
        messages.scrollTop = messages.scrollHeight;
    }

    function generateAgriculturalResponse(query, lang) {
        const q = query.toLowerCase();

        if (lang === "hi") {
            if (q.includes("रोग") || q.includes("disease"))
                return "CropSentry AI का मॉडल बेल पेपर, आलू और टमाटर की पत्तियों की 15 श्रेणियों में वर्गीकरण करता है। परिणाम मॉडल का अनुमान है, पक्का निदान नहीं।";
            if (q.includes("इलाज") || q.includes("treatment") || q.includes("दवा"))
                return "CropSentry AI उपचार या दवा की सलाह नहीं देता। उपचार के लिए स्थानीय कृषि विशेषज्ञ से संपर्क करें।";
            if (q.includes("फ्री") || q.includes("free") || q.includes("शुल्क"))
                return "CropSentry AI का leaf-classification demo उपलब्ध है। 🌱";
            return "आप समर्थित पत्ती की तस्वीर अपलोड करके मॉडल का अनुमान देख सकते हैं।";
        }

        if (lang === "mr") {
            if (q.includes("रोग") || q.includes("disease"))
                return "CropSentry AI चे मॉडेल बेल पेपर, बटाटा आणि टोमॅटोच्या पानांच्या 15 वर्गांमध्ये वर्गीकरण करते. हा मॉडेलचा अंदाज आहे, निश्चित निदान नाही.";
            if (q.includes("उपाय") || q.includes("treatment") || q.includes("औषध"))
                return "CropSentry AI उपचार किंवा औषधांची शिफारस करत नाही. उपचारासाठी स्थानिक कृषी तज्ज्ञांचा सल्ला घ्या.";
            if (q.includes("मोफत") || q.includes("free"))
                return "CropSentry AI चे leaf-classification demo उपलब्ध आहे. 🌱";
            return "समर्थित पिकाच्या पानाचा फोटो अपलोड करून मॉडेलचा अंदाज पाहू शकता.";
        }

        // English Default
        if (q.includes("treatment") || q.includes("medicine") || q.includes("pesticide") || q.includes("spray")) {
            return "CropSentry AI classifies supported leaf images but does not recommend treatments or pesticides. Please consult a local agricultural expert.";
        }
        if (q.includes("accuracy") || q.includes("model")) {
            return "The trained MobileNetV2 model achieved <strong>86.29% accuracy</strong> on a held-out test set of 3,101 images. Performance varies by class, and class scores are not diagnosis certainty.";
        }
        if (q.includes("free") || q.includes("cost") || q.includes("price")) {
            return "Yes! CropSentry AI is a <strong>free platform</strong> for farmers to explore leaf-class predictions. 🌱";
        }
        if (q.includes("disease") || q.includes("detect") || q.includes("supported")) {
            return "CropSentry AI supports <strong>15 bell pepper, potato, and tomato leaf classes</strong>, including healthy leaves. See the <a href='disease.html' style='color:var(--primary); font-weight:600;'>Model Classes page</a> for the full list.";
        }

        return "Upload a supported leaf image to see the model's class prediction. CropSentry AI does not assess severity or recommend treatment. Visit the <a href='predict.html' style='color:var(--primary); font-weight:600;'>Predict Page</a>.";
    }
}
