/****************************************************
 * HELP / SUPPORT
 * Handles FAQ topics, support content and the
 * Ticket Wizard assistant chat responses
 ****************************************************/

const SUPPORT_TOPICS = {
  booking: {
    keywords: ['book', 'booking', 'buy', 'purchase', 'checkout', 'pay', 'payment', 'ticket'],
    title: 'Booking Tickets',
    text: 'Select an event, choose your ticket type, continue to payment, and complete checkout to confirm your booking.',
    faqs: [
      {
        q: 'How do I buy tickets?',
        a: 'Select an event, choose your preferred ticket type, then continue to payment and confirm your order.'
      },
      {
        q: 'Can I buy more than one ticket?',
        a: 'Yes. You can choose the number of tickets during ticket selection, depending on availability.'
      }
    ]
  },

  tickets: {
    keywords: ['my ticket', 'my tickets', 'tickets', 'QR Code', 'QR code', 'QR ', 'qr', 'order history', "my order history"],
    title: 'My Tickets',
    text: 'You can view purchased tickets in your profile under Order History, where your QR codes and ticket details are stored.',
    faqs: [
      {
        q: 'Where can I find my tickets?',
        a: 'Go to your profile and open the Order History tab to view your tickets and QR codes or check your email.'
      },
      {
        q: 'Will my tickets show after purchase?',
        a: 'Yes. Once payment is successful, your order history stores your tickets and their QR codes or you may view them on your email address.'
      }
    ]
  },

  refunds: {
    keywords: ['refund', 'refunds', 'exchange', 'exchanges', 'money back', 'cancel ticket'],
    title: 'Refunds & Exchanges',
    text: 'Refunds and exchanges are not currently automated in Ticket Wizard.',
    faqs: [
      {
        q: 'Can I request a refund through Ticket Wizard?',
        a: 'No, ticket refunds are not possible.'
      },
      {
        q: 'Can I exchange my ticket for another event?',
        a: 'No. Ticket exchanges are not possible.'
      }
    ]
  },

  delivery: {
    keywords: ['delivery', 'deliver', 'email', 'sent', 'receive ticket', 'recieved ticket', 'recieved tickets', 'ticket email', 'tickets email', 'Tickets email', 'Tickets Email'],
    title: 'Ticket Delivery',
    text: 'After payment is confirmed, your ticket details and QR codes are stored in your order history and will be also sent to you by email.',
    faqs: [
      {
        q: 'How are tickets delivered?',
        a: 'Tickets are stored digitally in your profile under Order History and sent to your email address.'
      },
      {
        q: 'Are QR codes included with the ticket?',
        a: 'Yes. Each ticket includes a QR code used for event entry.'
      },
      {
        q: 'Do I need a physical ticket?',
        a: 'No. The system is designed to create QR tickets.'
      }
    ]
  },

  account: {
    keywords: ['account', 'login', 'password', 'profile', 'sign in', 'forgot password', 'reset password'],
    title: 'My Account',
    text: 'Use your account to log in, manage your profile, review order history, and reset your password when needed.',
    faqs: [
      {
        q: 'Can I reset my password?',
        a: 'Yes. Use the Forgot Password link on the login page and follow the reset link sent to your email.'
      },
      {
        q: 'Where can I manage my account details?',
        a: 'Open your profile page to view and manage your stored account information.'
      },
      {
        q: 'Do I need an account to buy tickets?',
        a: 'Not neccesarily. This platform supports guest checkout, but an account gives easier access to order history and profile features.'
      }
    ]
  },

  events: {
    keywords: ['event', 'venue', 'date', 'time', 'artist', 'location', 'genre'],
    title: 'Event Information',
    text: 'Customers can view event details such as venue, location, date, and ticket type information before purchasing.',
    faqs: [
      {
        q: 'What event details can I view before booking?',
        a: 'You can view the event title, artist, venue, location, date, ticket types, and pricing information.'
      },
      {
        q: 'Can I filter events?',
        a: 'Yes. The platform includes event filtering by search, location, date, and genre.'
      },
      {
        q: 'Can event details change?',
        a: 'Event information can be updated by promoters, so customers should check details before completing a purchase.'
      }
    ]
  },

  contact: {
    keywords: ['contact', 'support', 'help', 'email support', 'customer service'],
    title: 'Contact Us',
    text: 'For support, customers can use the Ticket Wizard assistant or FAQ.',
    faqs: [
      {
        q: 'How can I get help right now?',
        a: 'You can use the Ticket Wizard Assistant/FAQ on this page for quick guidance.'
      }
    ]
  }
};

function handleSupportChat() {
  const input = document.getElementById('support-chat-input');
  const messages = document.getElementById('support-chat-messages');

  if (!input || !messages) return;

  const userText = input.value.trim();
  if (!userText) return;

  messages.innerHTML += `
    <div class="chat-bubble user">${userText}</div>
  `;

  const q = userText.toLowerCase();

  let matchedTopic = null;

  for (const topicKey in SUPPORT_TOPICS) {
    const topic = SUPPORT_TOPICS[topicKey];
    const found = topic.keywords.some((keyword) => q.includes(keyword));
    if (found) {
      matchedTopic = topicKey;
      break;
    }
  }

  let replyHtml = '';

  if (matchedTopic) {
    const topic = SUPPORT_TOPICS[matchedTopic];

    replyHtml = `
      <div class="chat-topic-title">${topic.title}</div>
      <div class="chat-faq-group">
        ${topic.faqs.map((item) => `
          <div class="chat-faq-item">
            <div class="chat-faq-question">${item.q}</div>
            <div class="chat-faq-answer">${item.a}</div>
          </div>
        `).join('')}
      </div>
    `;

    showSupportTopic(matchedTopic);
  } else {
    replyHtml = `
      <div class="chat-topic-title">I’m not fully sure which category that belongs to.</div>
      <div class="chat-faq-answer">
        Try asking about booking, tickets, refunds, delivery, account, events, or contact support.
      </div>
    `;
  }

  messages.innerHTML += `
    <div class="chat-bubble bot">${replyHtml}</div>
  `;

  input.value = '';
  messages.scrollTop = messages.scrollHeight;
}

function showSupportTopic(topic) {
  const titleEl = document.getElementById('support-topic-title');
  const textEl = document.getElementById('support-topic-text');
  const faqListEl = document.getElementById('support-faq-list');

  if (!titleEl || !textEl || !faqListEl) return;

  const selected = SUPPORT_TOPICS[topic];
  if (!selected) return;

  titleEl.textContent = selected.title;
  textEl.textContent = selected.text;

  faqListEl.innerHTML = selected.faqs.map((item, index) => `
    <details class="faq-item" ${index === 0 ? 'open' : ''}>
      <summary>${item.q}</summary>
      <p>${item.a}</p>
    </details>
  `).join('');

  const supportDetailCard = titleEl.closest('.support-card');
  supportDetailCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

window.handleSupportChat = handleSupportChat;
window.showSupportTopic = showSupportTopic;
