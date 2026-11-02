const siteRoot='index.html';
function shareSite(){const data={title:'Flat Out Built-Up Roofing',text:'Free UK built-up felt roofing training and safety resources',url:'https://flatoutbuiltuproofing.co.uk/'};if(navigator.share){navigator.share(data).catch(()=>{});}else if(navigator.clipboard){navigator.clipboard.writeText(data.url).then(()=>alert('Website link copied')).catch(()=>prompt('Copy this link',data.url));}else{prompt('Copy this link',data.url);}}
function initShare(){document.querySelectorAll('[data-share]').forEach(b=>b.addEventListener('click',shareSite));}
document.addEventListener('DOMContentLoaded',initShare);
