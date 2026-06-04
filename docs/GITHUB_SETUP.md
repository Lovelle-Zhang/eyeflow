# GitHub Setup

EyeFlow 的本地仓库初始化后，推荐先推到一个私有 GitHub 仓库。

## 推荐仓库

- Repository name: `eyeflow`
- Visibility: private
- Default branch: `main`

## 如果安装了 GitHub CLI

```bash
gh auth login
gh repo create eyeflow --private --source=. --remote=origin --push
```

## 如果先在 GitHub 网页创建空仓库

创建空仓库后，在本地运行：

```bash
git remote add origin git@github.com:<your-user-or-org>/eyeflow.git
git push -u origin main
```

如果使用 HTTPS：

```bash
git remote add origin https://github.com/<your-user-or-org>/eyeflow.git
git push -u origin main
```

## 发布建议

Private alpha 包可以先放在 GitHub Releases，版本 tag 用：

```bash
git tag v0.1.0-alpha.1
git push origin v0.1.0-alpha.1
```

正式外测前再补：

- macOS 签名与公证
- 自动更新策略
- 崩溃上报
- 用户反馈入口
- 下载页或官网
