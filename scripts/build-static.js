const fs = require('fs');
const path = require('path');

const BLOGGER_URL = 'https://wiqayahpro.blogspot.com';
const SUPABASE_URL = 'https://hcoafdfhpizcgbbkcois.supabase.co';
const SUPABASE_KEY = 'sb_publishable__VZ2YFq6V_2SgVmd0y-AuA_U0StE5PG';

// Helper to calculate read time
function calculateReadTime(content) {
    if (!content) return 1;
    const words = content.replace(/<[^>]*>/g, '').trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
}

// Helper to format date
function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

// Helper to get high-res Blogger image
function getHighResImage(url) {
    if (!url) return 'https://files.catbox.moe/ru6efb.jpeg';
    if (url.includes('blogger.googleusercontent.com') || url.includes('bp.blogspot.com')) {
        if (url.includes('=')) {
            return url.split('=')[0] + '=s1600';
        }
        return url.replace(/\/([sw][0-9]+[^/]*)\//, '/s1600/');
    }
    return url;
}

// Auto-format plain text content to professional HTML (same logic as browser)
function autoFormatContent(text) {
    if (!text || !text.trim()) return '';
    const trimmed = text.trim();
    if (trimmed.startsWith('<') && (trimmed.includes('</p>') || trimmed.includes('</h3>') || trimmed.includes('</h4>') || trimmed.includes('</ul>') || trimmed.includes('</div>'))) {
        return text;
    }
    const blocks = text.split(/\n\s*\n/);
    let result = '';
    blocks.forEach(block => {
        const trimmedBlock = block.trim();
        if (!trimmedBlock) return;
        const lines = trimmedBlock.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) return;
        const firstLine = lines[0];

        if (firstLine.startsWith('# ')) {
            result += `<h3 style="color: #f39c12; margin: 30px 0 15px 0; font-size: 21px; font-weight: 800; border-bottom: 3px solid rgba(243, 156, 18, 0.15); padding-bottom: 8px;">${firstLine.substring(2).trim()}</h3>`;
            if (lines.length > 1) {
                result += `<p style="font-size: 16.5px; line-height: 2; margin-bottom: 18px; color: #2c3e50; text-align: justify;">${lines.slice(1).join(' ')}</p>`;
            }
        } else if (firstLine.startsWith('## ') || firstLine.startsWith('### ')) {
            const headingText = firstLine.replace(/^#+\s+/, '').trim();
            result += `<h4 style="color: #0d1e3d; margin: 25px 0 12px 0; font-size: 18px; font-weight: 700;">${headingText}</h4>`;
            if (lines.length > 1) {
                result += `<p style="font-size: 16.5px; line-height: 2; margin-bottom: 18px; color: #2c3e50; text-align: justify;">${lines.slice(1).join(' ')}</p>`;
            }
        } else if (firstLine.startsWith('> ')) {
            const quoteText = lines.map(l => l.startsWith('> ') ? l.substring(2).trim() : l).join(' ');
            result += `<blockquote style="border-right: 4px solid #f39c12; padding: 15px 25px; margin: 25px 0; font-style: italic; color: #555; background: rgba(243, 156, 18, 0.04); border-radius: 6px;">${quoteText}</blockquote>`;
        } else if (lines.every(l => l.startsWith('*') || l.startsWith('-') || l.startsWith('•') || l.startsWith('+') || /^\d+[\.\-\)]/.test(l))) {
            result += '<ul style="margin: 20px 20px 25px 0; padding-right: 25px; list-style-type: none;">';
            lines.forEach(l => {
                let itemText = l.replace(/^([\*\-\+•]|\d+[\.\-\)])\s*/, '').trim();
                itemText = itemText.replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #0d1e3d; font-weight: 700;">$1</strong>');
                result += `<li style="margin-bottom: 12px; position: relative; padding-right: 20px; font-size: 16px; line-height: 1.9; color: #2c3e50;"><span style="color: #f39c12; font-weight: bold; position: absolute; right: 0; top: 0;">•</span>${itemText}</li>`;
            });
            result += '</ul>';
        } else if ((firstLine.endsWith(':') || /^(\d+[\.\-\)]|أولاً|اولا|أولا|ثانياً|ثانيا|ثالثاً|ثالثا|رابعاً|رابعا|خامساً|خامسا|سادساً|سادسا|سابعاً|سابعا|ثامناً|ثامنا|تاسعاً|تاسعا|عاشراً|عاشرا)([:\s\-\.]|$)/.test(firstLine)) && firstLine.length < 100) {
            result += `<h3 style="color: #f39c12; margin: 28px 0 14px 0; font-size: 19px; font-weight: 700;">${firstLine}</h3>`;
            if (lines.length > 1) {
                result += `<p style="font-size: 16.5px; line-height: 2; margin-bottom: 18px; color: #2c3e50; text-align: justify;">${lines.slice(1).join(' ')}</p>`;
            }
        } else {
            result += `<p style="font-size: 16.5px; line-height: 2; margin-bottom: 18px; color: #2c3e50; text-align: justify;">${lines.join(' ')}</p>`;
        }
    });
    return result;
}

// Clean Blogger content image duplication
function cleanBloggerContentImage(content) {
    if (!content) return '';
    let clean = content
        .replace(/color:\s*#d1d8e0/gi, 'color: var(--text-dark)')
        .replace(/color:\s*var\(--text-light\)/gi, 'color: var(--text-dark)')
        .replace(/color:\s*rgb\(209,\s*216,\s*224\)/gi, 'color: var(--text-dark)');
    
    // We don't have document/DOM in node directly, so we use string replaces or regex for simple duplicate removal.
    // Generally, removing the first <img> tag inside an anchor/separator is sufficient.
    return clean;
}

async function build() {
    console.log('🚀 Starting static pages generator build script...');

    const postsDir = path.join(__dirname, '..', 'posts');
    if (!fs.existsSync(postsDir)) {
        fs.mkdirSync(postsDir);
        console.log('Created posts directory.');
    }

    let allPosts = [];

    // 1. Fetch Supabase posts
    console.log('Fetching posts from Supabase...');
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/posts?order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (res.ok) {
            const data = await res.json();
            const sbPosts = data.map(post => {
                const textOnly = post.content.replace(/<[^>]*>/g, '');
                const excerpt = textOnly.substring(0, 150).trim() + '...';
                return {
                    id: 'sb-' + post.id,
                    title: post.title,
                    content: autoFormatContent(post.content),
                    excerpt: excerpt,
                    publishDate: post.created_at || new Date().toISOString(),
                    categories: post.categories || [],
                    originalLink: '#',
                    image: post.image || 'https://files.catbox.moe/ru6efb.jpeg'
                };
            });
            allPosts = [...allPosts, ...sbPosts];
            console.log(`Loaded ${sbPosts.length} posts from Supabase.`);
        } else {
            console.error('Supabase fetch returned error status:', res.status);
        }
    } catch (e) {
        console.error('Error fetching Supabase posts:', e);
    }

    // 2. Fetch Blogger posts
    console.log('Fetching posts from Blogger...');
    try {
        const res = await fetch(`${BLOGGER_URL}/feeds/posts/default?alt=json&max-results=150`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.feed && data.feed.entry) {
                const entries = data.feed.entry;
                const bloggerPosts = entries.map(entry => {
                    const title = entry.title ? entry.title['$t'] : 'بدون عنوان';
                    const content = entry.content ? entry.content['$t'] : (entry.summary ? entry.summary['$t'] : '');
                    const publishDate = entry.published ? entry.published['$t'] : '';
                    const categories = entry.category ? entry.category.map(cat => cat.term) : ['عام'];
                    const altLink = entry.link ? entry.link.find(l => l.rel === 'alternate') : null;
                    const originalLink = altLink ? altLink.href : '#';
                    const rawId = entry.id ? entry.id['$t'] : '';
                    const postId = rawId.split('.post-')[1] || rawId.split('/').pop() || Math.random().toString(36).substr(2, 9);

                    let image = '';
                    if (entry['media$thumbnail']) {
                        image = getHighResImage(entry['media$thumbnail'].url);
                    } else {
                        const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
                        if (imgMatch) {
                            image = getHighResImage(imgMatch[1]);
                        }
                    }
                    if (!image) {
                        image = 'https://files.catbox.moe/ru6efb.jpeg';
                    }

                    const textOnly = content.replace(/<[^>]*>/g, '');
                    const excerpt = textOnly.substring(0, 150).trim() + '...';

                    return {
                        id: postId,
                        title: title,
                        content: cleanBloggerContentImage(content),
                        excerpt: excerpt,
                        publishDate: publishDate,
                        categories: categories,
                        originalLink: originalLink,
                        image: image
                    };
                });
                allPosts = [...allPosts, ...bloggerPosts];
                console.log(`Loaded ${bloggerPosts.length} posts from Blogger.`);
            }
        } else {
            console.error('Blogger fetch returned error status:', res.status);
        }
    } catch (e) {
        console.error('Error fetching Blogger posts:', e);
    }

    // Sort posts by date descending
    allPosts.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
    console.log(`Total posts consolidated: ${allPosts.length}`);

    // Read index.html to act as our template
    const indexPath = path.join(__dirname, '..', 'index.html');
    if (!fs.existsSync(indexPath)) {
        console.error('index.html not found!');
        return;
    }
    let indexHtml = fs.readFileSync(indexPath, 'utf8');

    // 3. Update the baked-in posts array in index.html to achieve absolute 0ms homepage loading delay
    const preloadRegex = /let _preloadedPosts\s*=\s*null;/;
    const preloadReplacement = `let _preloadedPosts = ${JSON.stringify(allPosts)};`;
    
    if (preloadRegex.test(indexHtml)) {
        indexHtml = indexHtml.replace(preloadRegex, preloadReplacement);
        console.log('Successfully baked all consolidated articles list directly into index.html script payload.');
    } else {
        // Fallback: search for let _preloadedPosts = [...]; if already baked
        const bakedRegex = /let _preloadedPosts\s*=\s*\[[\s\S]*?\];/;
        if (bakedRegex.test(indexHtml)) {
            indexHtml = indexHtml.replace(bakedRegex, preloadReplacement);
            console.log('Successfully updated the baked articles list in index.html.');
        } else {
            console.warn('Could not find _preloadedPosts variable declaration inside index.html to bake data!');
        }
    }

    // Save updated index.html
    fs.writeFileSync(indexPath, indexHtml, 'utf8');
    console.log('Saved index.html updates.');

    // 4. Generate the static HTML file for each article
    console.log('Generating static HTML pages for all articles...');
    allPosts.forEach(post => {
        const dateStr = formatDate(post.publishDate);
        const readTime = calculateReadTime(post.content);
        const firstCat = post.categories[0] || 'عام';
        
        let imgSrc = getHighResImage(post.image || 'https://files.catbox.moe/ru6efb.jpeg');
        if (imgSrc.startsWith('assets/images/')) {
            imgSrc = '../' + imgSrc;
        }

        const categoriesHtml = post.categories.map(cat => {
            return `<span class="post-category-badge" style="position:static; display:inline-block; margin-left:5px;">${cat}</span>`;
        }).join('');

        // Helper to insert middle ad
        let processedContent = post.content || '';
        processedContent = processedContent.replace(/src="assets\/images\//g, 'src="../assets/images/');
        
        const adCode = `<div class="post-ad-wrapper middle-post-ad" style="margin: 30px 0; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 5px; text-align: center;">إعلان</div>
            <ins class="adsbygoogle" style="display:block" data-ad-format="auto" data-full-width-responsive="true"></ins>
        </div>`;
        const paragraphs = processedContent.split('</p>');
        if (paragraphs.length > 3) {
            const middleIndex = Math.floor(paragraphs.length / 2);
            paragraphs[middleIndex] = paragraphs[middleIndex] + '</p>' + adCode;
            processedContent = paragraphs.join('</p>');
        } else {
            processedContent = processedContent + adCode;
        }

        // Single post view pre-rendered HTML content
        const postHtmlContent = `
        <button class="single-post-back-btn" onclick="window.location.href='../index.html';">
            <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            <span>العودة للرئيسية</span>
        </button>
        <header class="single-post-header">
            <h1 class="single-post-title">${post.title}</h1>
            <div class="single-post-meta">
                <span>
                    <svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm-5-7h-5v5h5v-5z"/></svg>
                    ${dateStr}
                </span>
                <span>
                    <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                    ${readTime} دقائق قراءة
                </span>
                <span style="display:inline-flex; align-items:center;">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                    أقسام: ${categoriesHtml}
                </span>
            </div>
        </header>
        
        <div class="post-actions-toolbar">
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 13px; color: var(--text-light); font-weight: 700;">مشاركة المقال:</span>
                <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(post.title + ' - ') + encodeURIComponent('https://www.wi9ayah.pro/posts/' + post.id + '.html')}" target="_blank" class="share-icon-btn whatsapp" title="واتساب">
                    <svg viewBox="0 0 24 24" style="width: 22px; height: 22px;">
                        <path d="M12 2C6.48 2 2 6.48 2 12c0 2.17.69 4.19 1.86 5.86L2.5 22.5l4.82-1.27C8.89 21.87 10.4 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="rgba(0,0,0,0.15)"/>
                        <path d="M12.01 2.01c-5.52 0-10 4.48-10 10.01 0 2.17.7 4.2 1.86 5.87L2.5 22.5l4.83-1.27c1.55.85 3.06.98 4.67.98 5.52 0 10-4.48 10-10.01s-4.48-10.2-10-10.2z" fill="#ffffff"/>
                        <path d="M12.01 3.5c-4.7 0-8.52 3.82-8.52 8.52 0 1.84.58 3.54 1.58 4.93l-.97 3.53 3.63-.95c1.33.72 2.85.83 4.28.83 4.7 0 8.52-3.82 8.52-8.52s-3.82-8.34-8.52-8.34z" fill="#ffffff"/>
                        <path d="M15.93 14.12c-.22-.11-1.3-.64-1.51-.71-.2-.07-.35-.11-.5.11-.15.22-.57.71-.7 1-.13.15-.26.17-.48.06-2.14-1.07-3.05-1.96-3.57-2.85-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.07-.15.03-.28-.02-.39-.05-.11-.5-1.2-1.02-2.45-.18-.43-.36-.37-.5-.37h-.42c-.15 0-.39.06-.59.28-.2.22-.77.75-.77 1.83 0 1.08.79 2.13.9 2.28.11.15 1.54 2.36 3.74 3.31.52.23.93.36 1.25.46.52.17 1 .14 1.38.09.42-.06 1.3-.53 1.48-1.04.18-.51.18-.95.13-1.04-.06-.09-.2-.15-.43-.26z" fill="#25D366"/>
                    </svg>
                </a>
                <a href="https://t.me/share/url?url=${encodeURIComponent('https://www.wi9ayah.pro/posts/' + post.id + '.html')}&text=${encodeURIComponent(post.title)}" target="_blank" class="share-icon-btn telegram" title="تيليجرام">
                    <svg viewBox="0 0 24 24" style="width: 22px; height: 22px;">
                        <circle cx="12" cy="12" r="10.5" fill="#ffffff"/>
                        <circle cx="12" cy="12" r="9.5" fill="#229ED9"/>
                        <path d="M7.8 11.8l10.7-4.9-7.8 7.2z" fill="#ffffff"/>
                        <path d="M18.5 6.9L15.8 15l-5.1-3.3z" fill="#E3F2FD"/>
                        <path d="M10.7 14.1v2.8l1.6-2.2z" fill="#90CAF9"/>
                     </svg>
                </a>
                <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://www.wi9ayah.pro/posts/' + post.id + '.html')}" target="_blank" class="share-icon-btn linkedin" title="لينكد إن">
                    <svg viewBox="0 0 24 24" style="width: 22px; height: 22px;">
                        <rect x="2" y="2" width="20" height="20" rx="4" fill="#ffffff" />
                        <rect x="3" y="3" width="18" height="18" rx="3" fill="#0077B5" />
                        <g fill="#004e77" transform="translate(0.8, 0.8)">
                            <path d="M19 18.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.8v8.37h2.8v-4.67c0-.25.02-.5.1-.68a1.14 1.14 0 0 1 1-.77c.76 0 1 .52 1 1.42v4.7h2.8M6.5 8.37a1.37 1.37 0 1 0 0-2.75 1.37 1.37 0 0 0 0 2.75M5.1 18.5h2.8V10.1H5.1v8.4z"/>
                        </g>
                        <g fill="#ffffff">
                            <path d="M19 18.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.8v8.37h2.8v-4.67c0-.25.02-.5.1-.68a1.14 1.14 0 0 1 1-.77c.76 0 1 .52 1 1.42v4.7h2.8M6.5 8.37a1.37 1.37 0 1 0 0-2.75 1.37 1.37 0 0 0 0 2.75M5.1 18.5h2.8V10.1H5.1v8.4z"/>
                        </g>
                    </svg>
                </a>
                <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent('https://www.wi9ayah.pro/posts/' + post.id + '.html')}&text=${encodeURIComponent(post.title)}" target="_blank" class="share-icon-btn twitter" title="إكس / تويتر">
                    <svg viewBox="0 0 24 24" style="width: 22px; height: 22px;">
                        <rect x="2" y="2" width="20" height="20" rx="4" fill="#ffffff" />
                        <rect x="3" y="3" width="18" height="18" rx="3" fill="#111111" />
                        <g fill="#555555" transform="translate(0.8, 0.8)">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </g>
                        <g fill="#ffffff">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </g>
                    </svg>
                </a>
            </div>
        </div>

        <div class="single-post-cover-container" style="width: 100%; max-height: 480px; overflow: hidden; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
            <img src="${imgSrc}" alt="${post.title}" style="width: 100%; height: auto; object-fit: cover; max-height: 480px; display: block;">
        </div>
        
        <div class="post-ad-wrapper top-post-ad" style="margin: 20px 0; text-align: center;">
            <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 5px; text-align: center;">إعلان</div>
            <ins class="adsbygoogle" style="display:block" data-ad-format="auto" data-full-width-responsive="true"></ins>
        </div>
        
        <article class="single-post-content">${processedContent}</article>
        
        <div class="post-ad-wrapper bottom-post-ad" style="margin: 35px 0 20px 0; text-align: center; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 20px;">
            <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 5px; text-align: center;">إعلان</div>
            <ins class="adsbygoogle" style="display:block" data-ad-format="auto" data-full-width-responsive="true"></ins>
        </div>

        <div class="author-profile-card">
            <img src="https://files.catbox.moe/ub1za9.png" alt="صورة الكاتب" class="author-profile-img">
            <div class="author-profile-info">
                <div class="author-profile-label">كاتب المقال</div>
                <h4 class="author-profile-name">المهندس أحمد</h4>
                <p class="author-profile-title">مستشار السلامة والصحة المهنية ومكافحة الحرائق</p>
            </div>
        </div>
        
        <div class="comments-section-wrapper">
            <div class="comments-header">
                <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
                <h3>التعليقات والمناقشات</h3>
            </div>
            <p class="comments-intro">
                شاركنا برأيك أو استفسارك حول هذه التدوينة. يتم نشر تعليقك وحفظه فورياً.
            </p>
            <div id="comments-list" class="comments-list">
                <div class="comments-loading">جاري تحميل التعليقات...</div>
            </div>
            
            <div class="comment-form">
                <h4>إضافة تعليق جديد</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label for="comment-nickname">الاسم المستعار (Nickname) *</label>
                        <input type="text" id="comment-nickname" placeholder="مثال: محمد علي" required>
                    </div>
                    <div class="form-group">
                        <label for="comment-email">البريد الإلكتروني (لن يتم نشره) *</label>
                        <input type="email" id="comment-email" placeholder="example@mail.com" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="comment-text">نص التعليق *</label>
                    <textarea id="comment-text" rows="4" placeholder="اكتب تعليقك أو استفسارك هنا..." required></textarea>
                </div>
                <div class="form-actions">
                    <button id="submit-comment-btn" class="comment-submit-btn">نشر التعليق</button>
                </div>
            </div>
        </div>
        `;

        // 5. Create a clone of indexHtml template for this post
        let postHtml = indexHtml;

        // 6. Make all relative page URLs point to parent directory level (since this file is in posts/)
        const relativeLinks = [
            'about.html',
            'contact.html',
            'calculators.html',
            'faq.html',
            'terms.html',
            'privacy.html',
            'nfpa.html',
            'archive.html',
            'index.html',
            'redirect.html'
        ];
        relativeLinks.forEach(link => {
            postHtml = postHtml.split(`href="${link}"`).join(`href="../${link}"`);
            postHtml = postHtml.split(`href='${link}'`).join(`href='../${link}'`);
            postHtml = postHtml.split(`href="${link}?`).join(`href="../${link}?`);
            postHtml = postHtml.split(`href='${link}?`).join(`href='../${link}?`);
        });

        // 7. Inject static single-post indicator variables in JS header
        const staticScriptSetup = `
    <!-- Static Page Helpers -->
    <script>
        window.isStaticPostPage = true;
        window.staticPostId = "${post.id}";
    </script>
        `;
        postHtml = postHtml.replace('</head>', `${staticScriptSetup}\n</head>`);

        // 8. Put pre-rendered HTML in single-post-view div container and set it to display:block
        const singlePostPlaceholder = '<div id="single-post-view" class="container single-post-container" style="display: none;"></div>';
        const singlePostPrepopulated = `<div id="single-post-view" class="container single-post-container" style="display: block;">${postHtmlContent}</div>`;
        postHtml = postHtml.replace(singlePostPlaceholder, singlePostPrepopulated);

        // 9. Hide the home-specific elements in HTML
        postHtml = postHtml.replace('<div class="hero-slider">', '<div class="hero-slider" style="display:none;">');
        postHtml = postHtml.replace('<div class="main-grid">', '<div class="main-grid" style="display:none;">');
        postHtml = postHtml.replace('<section class="benefits-section">', '<section class="benefits-section" style="display:none;">');
        postHtml = postHtml.replace('<section class="static-banner-section" style="display: none;">', '<section class="static-banner-section" style="display: block;">');

        // 10. Update HTML SEO Title & Meta Description Tags
        const oldTitleRegex = /<title>[\s\S]*?<\/title>/i;
        postHtml = postHtml.replace(oldTitleRegex, `<title>${post.title} | منصة وقاية برو للسلامة المهنية</title>`);

        // Inject specific Meta tags for SEO & Social Sharing
        const oldMetaDescRegex = /<meta name="description"[\s\S]*?>/i;
        const newMetaDesc = `<meta name="description" content="${post.excerpt.replace(/"/g, '&quot;')}">`;
        if (oldMetaDescRegex.test(postHtml)) {
            postHtml = postHtml.replace(oldMetaDescRegex, newMetaDesc);
        }

        // OpenGraph SEO Meta Tags
        const ogTags = `
    <meta property="og:title" content="${post.title.replace(/"/g, '&quot;')} | وقاية برو">
    <meta property="og:description" content="${post.excerpt.replace(/"/g, '&quot;')}">
    <meta property="og:image" content="${imgSrc}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://www.wi9ayah.pro/posts/${post.id}.html">
        `;
        postHtml = postHtml.replace('<head>', `<head>\n${ogTags}`);

        // Write file
        const postFilePath = path.join(postsDir, `${post.id}.html`);
        fs.writeFileSync(postFilePath, postHtml, 'utf8');
    });

    console.log(`✅ Successfully generated ${allPosts.length} static HTML article pages under /posts/ folder!`);
}

build();
