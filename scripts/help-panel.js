const TIPS = [
  "在搜索框中输入要搜索的内容，并@指定平台，可在指定平台进行搜索；",
  "在搜索框中同时@多个平台，可以同时在多个平台搜索（需浏览器支持弹出多个窗口）；",
  "在搜索框中连续@同一平台两次，可将其固定在搜索框前方，作为暂时的缺省搜索引擎，再次点击删除；",
  "在搜索框中可同时固定多个缺省搜索引擎，方便多次使用同一设置搜索；",
  "在「我查看过」中可以查看搜索历史，点击任意历史可以再次搜索内容；",
  "在「随便看看」中可以查看网址导航，并且对其进行增删和替换顺序；",
];

const STORY_PARAGRAPHS = [
  "作为一个ADHD（注意力缺陷障碍）患者，",
  "我经常会突然停下来，想不起我本来是要做什么，本来是要说什么，本来是在想什么，不知道我现在在哪里；",
  "热点排行、搜推算法，在帮助我们方便看到世界的同时，也让我们越来越难以看到自己。",
  "设计这个网站作为我的浏览器首页，帮助自己看好注意力，保持觉察力，提醒自己：",
  "今天，此刻，本来是要做什么。",
  "希望也可以帮到你。"
];

const EMAIL = "BigTree0606@foxmail.com";

export function initHelpPanel(panel) {
  const h3 = document.createElement("h3");
  h3.textContent = "使用技巧";

  const ol = document.createElement("ol");
  for (const tip of TIPS) {
    const li = document.createElement("li");
    li.textContent = tip;
    ol.appendChild(li);
  }

  const footer = document.createElement("div");
  footer.className = "help-footer";

  const subtitle = document.createElement("h3");
  subtitle.className = "help-subtitle";
  subtitle.textContent = "开发初心";
  footer.appendChild(subtitle);

  for (const para of STORY_PARAGRAPHS) {
    const p = document.createElement("p");
    p.className = "help-story";
    p.innerHTML = para;
    footer.appendChild(p);
  }

  const email = document.createElement("p");
  email.className = "help-email";
  email.innerHTML = `帮助建议：<a href="mailto:${EMAIL}">${EMAIL}</a>`;
  footer.appendChild(email);

  panel.appendChild(h3);
  panel.appendChild(ol);
  panel.appendChild(footer);
}
