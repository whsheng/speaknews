import './style.css';
import { XMLParser } from 'fast-xml-parser';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});

async function fetchRSSFeed() {
  try {
    const response = await fetch('https://api.allorigins.win/raw?url=https://data.getpodcast.xyz/data/ximalaya/68589357.xml');
    const xmlText = await response.text();
    const data = parser.parse(xmlText);
    return data.rss.channel;
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    return null;
  }
}

function formatPubDate(dateStr) {
  try {
    const date = new Date(dateStr);
    return format(date, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
  } catch (error) {
    return dateStr;
  }
}

function cleanDescription(description) {
  if (!description) return '';
  // 先分割掉不需要的内容，然后处理换行
  const cleanText = description.split('查看节目原文及链接')[0].trim();
  // 将 <br> 和 <br/> 统一转换为换行符
  return cleanText.replace(/<br\s*\/?>/gi, '\n');
}

function truncateText(text, length = 300) {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

function createNewsApp() {
  const app = document.querySelector('#app');
  let currentAudio = null;
  let currentNewsIndex = 0;
  let newsData = null;
  let displayCount = 10; // 添加显示计数器
  
  function playNews(index, autoPlay = false) {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    
    // 先滚动到顶部，确保用户能立即看到新内容
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    currentNewsIndex = index;
    const news = newsData.item[index];
    
    // 创建新的音频实例
    currentAudio = new Audio(news.enclosure["@_url"]);
    
    // 更新界面内容
    document.querySelector('.current-news-title').textContent = news.title;
    document.querySelector('.current-news-time').textContent = formatPubDate(news.pubDate);
    
    // 更新新闻简介
    const description = cleanDescription(news.description);
    const descriptionElement = document.querySelector('.news-description.collapsed');
    const fullContentElement = document.querySelector('.news-description.full-content');
    descriptionElement.textContent = truncateText(description);
    fullContentElement.innerHTML = description.split('\n').map(line => `<p>${line}</p>`).join('');
    
    // 重置播放按钮状态
    const playButton = document.querySelector('.play-button');
    playButton.classList.remove('playing');
    playButton.querySelector('.play-icon').textContent = '▶';
    isPlaying = false;
    
    // 高亮当前播放的新闻
    document.querySelectorAll('.past-news-item').forEach((item, i) => {
      item.classList.toggle('active', i === index);
    });
  
    // 如果需要自动播放
    if (autoPlay) {
      setTimeout(() => {
        playButton.click();
      }, 500);
    }
  }
  
  // Initial render with loading state
  app.innerHTML = `
    <div class="container">
      <div class="loading">加载中...</div>
    </div>
  `;

  // Fetch and render RSS content
  fetchRSSFeed().then(channel => {
    if (!channel) {
      app.querySelector('.container').innerHTML = '<div class="error">获取新闻失败，请稍后重试</div>';
      return;
    }

    newsData = channel;
    const latestNews = channel.item[0];
    const description = cleanDescription(latestNews.description);
    
    function renderNewsList() {
      const items = channel.item.slice(0, displayCount);
      return items.map((item, index) => `
        <li class="past-news-item ${index === currentNewsIndex ? 'active' : ''}" data-index="${index}">
          <div class="past-news-info">
            <span class="past-news-title">${item.title}</span>
            <span class="past-news-meta">${formatPubDate(item.pubDate)}</span>
          </div>
        </li>
      `).join('');
    }
    
    app.innerHTML = `
      <div class="container">
        <!-- 顶部标题 -->
        <header class="site-header">
          <h1 class="site-title">每天10分钟，畅晓天下事！</h1>
        </header>

        <!-- 当前新闻 -->
        <section class="current-news">
          <div class="news-card">
            <div class="news-logo">
              <img src="/10min-logo.png" alt="10分钟新闻" class="logo-image">
            </div>
            <div class="news-info">
              <h2 class="current-news-title">${latestNews.title}</h2>
              <div class="news-meta">
                <span class="current-news-time">${formatPubDate(latestNews.pubDate)}</span>
                <span class="news-category">#高考新闻</span>
              </div>
              <div class="news-controls">
                <button class="play-button">
                  <span class="play-icon">▶</span>
                </button>
                <button class="like-button">喜欢</button>
                <button class="share-button">分享</button>
                <button class="subscribe-button">订阅</button>
                
              </div>
            </div>
          </div>

          <!-- 新闻内容 -->
          <div class="news-content">
            <h3 class="content-title">新闻简介</h3>
            <div class="news-description collapsed">${truncateText(description)}</div>
            <div class="news-description full-content" style="display: none">${description.split('\n').map(line => `<p>${line}</p>`).join('')}</div>
            <button class="expand-button">查看全部</button>
          </div>
        </section>

        <!-- 过往新闻列表 -->
        <section class="past-news">
          <h3 class="section-title">历史新闻</h3>
          <ul class="past-news-list">
            ${renderNewsList()}
          </ul>
          <button class="load-more" ${displayCount >= channel.item.length ? 'disabled' : ''}>
            查看更多
          </button>
        </section>
      </div>
    `;

    // Add event listeners
    const playButton = document.querySelector('.play-button');
    const newsLogo = document.querySelector('.news-logo');
    let isPlaying = false;
    
    // 喜欢按钮事件
    const likeButton = document.querySelector('.like-button');
    likeButton.addEventListener('click', () => {
      const heart = document.createElement('span');
      heart.textContent = '❤';
      heart.className = 'heart-animation';
      likeButton.appendChild(heart);
      
      setTimeout(() => heart.remove(), 800);
    });

    // 分享按钮事件
    const shareButton = document.querySelector('.share-button');
    shareButton.addEventListener('click', () => {
      const currentNews = newsData.item[currentNewsIndex];
      const shareText = `${currentNews.title} - 每天10分钟，畅晓天下事！`;
      const shareUrl = `https://news.k12go.com/?id=${currentNewsIndex}`;
      
      if (navigator.share) {
        navigator.share({
          title: '10分钟新闻',
          text: shareText,
          url: shareUrl
        }).catch(console.error);
      } else {
        const tempInput = document.createElement('input');
        tempInput.value = `${shareText}\n${shareUrl}`;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        showToast('分享链接已复制到剪贴板！');
      }
    });

    // 订阅按钮事件
    const subscribeButton = document.querySelector('.subscribe-button');
    subscribeButton.addEventListener('click', () => {
      showToast('订阅服务尚未上线，敬请期待');
    });

    // 通用提示框函数
    function showToast(message) {
      const toast = document.createElement('div');
      toast.className = 'toast-message';
      toast.textContent = message;
      document.body.appendChild(toast);
      
      setTimeout(() => toast.remove(), 2000);
    }

    playButton.addEventListener('click', () => {
      isPlaying = !isPlaying;
      playButton.classList.toggle('playing', isPlaying);
      playButton.querySelector('.play-icon').textContent = isPlaying ? '⏸' : '▶';
      
      // 控制音频播放
      if (isPlaying) {
        currentAudio?.play();
      } else {
        currentAudio?.pause();
      }
    });

    newsLogo.addEventListener('click', () => {
      playButton.click();
    });

    // Expand/collapse description
    const expandButton = document.querySelector('.expand-button');
    const descriptionElement = document.querySelector('.news-description.collapsed');
    const fullContentElement = document.querySelector('.news-description.full-content');
    
    expandButton.addEventListener('click', () => {
      const isExpanded = fullContentElement.style.display === 'block';
      if (isExpanded) {
        descriptionElement.style.display = 'block';
        fullContentElement.style.display = 'none';
        expandButton.textContent = '查看全部';
      } else {
        descriptionElement.style.display = 'none';
        fullContentElement.style.display = 'block';
        expandButton.textContent = '收起';
      }
    });

    // Past news item click events
    document.querySelectorAll('.past-news-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        playNews(index, true); // 添加 true 参数启用自动播放
      });
    });

    // Load more button 中的点击事件也需要更新
    document.querySelectorAll('.past-news-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        playNews(index, true); // 添加 true 参数启用自动播放
      });
    });

    // Load more button event listener
    const loadMoreButton = document.querySelector('.load-more');
    loadMoreButton.addEventListener('click', () => {
      displayCount += 10;
      const newsList = document.querySelector('.past-news-list');
      newsList.innerHTML = renderNewsList();
      
      // 更新按钮状态
      if (displayCount >= channel.item.length) {
        loadMoreButton.disabled = true;
        loadMoreButton.textContent = '已显示全部';
      }

      // 重新绑定点击事件
      document.querySelectorAll('.past-news-item').forEach(item => {
        item.addEventListener('click', () => {
          const index = parseInt(item.dataset.index);
          playNews(index);
        });
      });
    });

    // Initialize with first news
    playNews(0);
  });
}

// Initialize the app
createNewsApp();