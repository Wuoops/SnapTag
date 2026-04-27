# SnapTag - 智能文件标签管理系统

一个基于标签的文件管理系统，通过强大的标签系统实现文件的快速检索和全方位描述。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Ant Design 5 + Vite |
| 后端 | Django 4.2 + Django REST Framework |
| 数据库 | PostgreSQL 16 (pg_trgm 扩展) |
| 部署 | Docker Compose |

## 核心功能

- **智能标签系统**：支持标签别名/同义词、自动补全、模糊匹配（基于 PostgreSQL trigram）
- **文件管理**：上传、预览、搜索、收藏、批量操作
- **多维度检索**：按标签组合（AND 逻辑）、文件名、描述、文件类型、日期范围
- **用户系统**：注册、登录、密码找回
- **备份恢复**：一键备份数据库和文件，支持下载和恢复

## 快速部署

```bash
# 1. 克隆项目
git clone <repo-url> && cd SnapTag

# 2. 复制环境变量（按需修改）
cp .env.example .env

# 3. 一键启动
docker compose up -d --build

# 4. 创建超级管理员（可选）
docker compose exec backend python manage.py createsuperuser
```

启动后访问 http://localhost:3000

## 项目结构

```
SnapTag/
├── backend/                # Django 后端
│   ├── apps/
│   │   ├── accounts/       # 用户认证
│   │   ├── files/          # 文件管理
│   │   ├── tags/           # 标签系统
│   │   └── backups/        # 备份恢复
│   ├── snaptag/            # Django 配置
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/               # React 前端
│   ├── src/
│   │   ├── api/            # API 调用层
│   │   ├── components/     # 通用组件
│   │   ├── hooks/          # 自定义 Hooks
│   │   ├── pages/          # 页面组件
│   │   └── types/          # TypeScript 类型
│   ├── Dockerfile
│   └── nginx.conf
├── docker/
│   └── postgres/init.sql
├── docker-compose.yml
└── .env.example
```

## 标签系统设计

标签匹配优先级（从高到低）：
1. **精确匹配** - 输入与标签名完全一致
2. **前缀匹配** - 输入是标签名的前缀
3. **别名匹配** - 输入匹配标签的某个别名
4. **相似匹配** - 基于 trigram 相似度算法

## 环境变量说明

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `POSTGRES_PASSWORD` | 数据库密码 | snaptag_secret_2024 |
| `DJANGO_SECRET_KEY` | Django 密钥 | (请修改) |
| `FRONTEND_PORT` | 前端端口 | 3000 |
| `CORS_ALLOWED_ORIGINS` | 跨域白名单 | http://localhost:3000 |
