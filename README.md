# 🚀 Niyoplan: The Unified Project Management Hub

Niyoplan is a state-of-the-art, monolithic project management platform built on **Next.js 15**. It integrates the power of a modern frontend with a robust, serverless-ready API layer, all in one high-performance repository.

Inspired by industry leaders like Jira and ClickUp, Niyoplan provides a comprehensive suite of tools for agile teams, enhanced by cutting-edge AI features.

---

## ✨ Key Features

### 📋 Agile Management
- **Advanced Kanban Boards**: Fluid drag-and-drop task management with `dnd-kit`.
- **Sprint Manager**: Seamlessly transition from backlog to active sprints.
- **Interactive Gantt Charts**: Visualize project timelines and dependencies.

### 🤖 AI Productivity (Powered by Groq)
- **Automatic Summaries**: Generate project and sprint status reports instantly.
- **Smart Descriptions**: Improve task clarity with AI-driven suggestions.
- **Intelligent Planning**: Optimize your backlog with automated insights.

### 📊 Collaboration Hubs
- **DSM (Daily Stand-up Meeting)**: Specialized boards for quick team alignment.
- **Meeting Reviews**: Integrated workspace for recording and actioning meeting outcomes.
- **Goals & OKRs**: Track high-level objectives and key results.
- **Docs & Workspace**: A centralized home for project documentation.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Core** | [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/), CSS Modules, Lucide Icons |
| **Backend** | Next.js [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL, Auth, SSR) |
| **AI Engine** | [Groq SDK](https://groq.com/) (Llama 3.x Models) |
| **Utilities** | dnd-kit, date-fns, React Hot Toast, clsx |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20.x or later
- A Supabase project with PostgreSQL enabled
- A Groq API key

### Installation
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/devrajsinh2012/Niyoplan.git
    cd Niyoplan
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Configuring Environment Variables**:
    Create a `.env` file in the root directory and add your credentials:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
    SUPABASE_SERVICE_KEY=your_service_key
    GROQ_API_KEY=your_groq_key
    SUPABASE_DB_POOL_URL=your_db_url
    ```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the application.

### 🐳 Docker Support

Niyoplan is fully containerized for easy handling and deployment.

1.  **Build and Start**:
    ```bash
    docker compose up -d --build
    ```
2.  **Access the App**:
    The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 📁 Project Structure

```text
├── app/                  # Next.js App Router (Pages & API Routes)
│   ├── api/              # Unified API Layer (Route Handlers)
│   └── projects/         # Core Project Dashboard
├── components/           # Reusable UI Components
│   ├── kanban/           # Board and Card components
│   ├── sprints/          # Sprint management logic
│   └── ai/               # AI-powered tools
├── lib/                  # Shared Utilities (Supabase, Auth, Helpers)
├── context/              # Global State (AuthContext)
└── public/               # Static Assets
```

---

## 🚢 Deployment

Niyoplan is optimized for deployment on **Vercel**. Simply connect your repository, add your environment variables, and deploy. The monolithic architecture ensures seamless synchronization between your frontend and API.

---

## 🛡️ License & Contact

**Maintainer**: Devrajsinh Gohil
- **GitHub**: [@devrajsinh2012](https://github.com/devrajsinh2012)
- **Email**: djgohil2012@gmail.com

---

*Built with passion for high-performance team collaboration.*
