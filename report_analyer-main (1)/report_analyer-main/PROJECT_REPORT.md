# Report Analyzer - Project Documentation

## 1. Project Overview

**Project Name:** Report Analyzer (DataLens)
**Description:** 
A sophisticated, offline-first web application designed for analyzing CSV data reports. It combines robust local data processing with cloud-based persistence and advanced AI capabilities to provide deep insights, anomaly detection, and conversational data exploration. The application is built to be modern, responsive, and visually engaging, suitable for business intelligence, operations monitoring, and data quality assurance.

**Core Value Proposition:**
- **Instant Local Analysis:** Load and interact with CSVs immediately without latency.
- **AI-Powered Insights:** Leverage Google Gemini models for deep scanning and anomaly detection.
- **Conversational Interface:** Chat with your data for context-aware answers.
- **Offline Reliability:** Seamlessly switch between online (Supabase sync) and offline (LocalStorage) modes.
- **Visual Analytics:** Integrated charting and statistical summaries.

---

## 2. Technical Architecture

### 2.1 Tech Stack

*   **Frontend Framework:** [Next.js](https://nextjs.org/) (React)
    *   Utilizes the App Router for modern routing and layouts.
    *   Server-Side Rendering (SSR) and Client-Side Rendering (CSR) blend for performance.
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
    *   Utility-first CSS framework for rapid UI development.
    *   Custom themes and animations (including `tailwindcss-animate`).
    *   Shadcn/UI components for a polished, accessible design system.
*   **Backend & Database:** [Supabase](https://supabase.com/)
    *   PostgreSQL database for reliable cloud persistence.
    *   Real-time subscription capabilities (prepared for future sync enhancements).
*   **AI Integration:** [Google Gemini API](https://ai.google.dev/)
    *   Model: `gemini-2.0-flash` (or `1.5-flash` depending on quota).
    *   Used for: Chatbot interactions, Deep Scan anomaly detection, and Smart Fix suggestions.
*   **Data Processing:**
    *   `papaparse`: High-performance CSV parsing in the browser.
    *   `recharts`: Composable charting library for React.
*   **Icons:** `lucide-react` for consistent, scalable vector icons.

### 2.2 Data Flow Architecture

1.  **Ingestion:** Users upload CSV files or load test data.
2.  **Parsing:** `papaparse` converts CSV text into JSON objects client-side.
3.  **Persistence (Dual-Layer):**
    *   **Primary (L1):** `localStorage` ('ops_reports') ensures immediate access and offline capability.
    *   **Secondary (L2):** Asynchronously syncs to Supabase (`reports` table) when online.
4.  **Analysis:**
    *   **Heuristic Engine:** Local logic calculates stats (min, max, avg), detects types, and identifies basic errors (nulls, suspicious characters) immediately upon load.
    *   **AI Layer:** On-demand API calls send data samples to Gemini for semantic understanding and complex anomaly detection.
5.  **Interaction:** User edits, fixes, and chat messages update the local state first (Optimistic UI), then persist to storage.

---

## 3. Key Features

### 3.1 Report Management
*   **Sidebar Navigation:** A dark-themed, scrollable sidebar listing all available reports.
*   **Default Datasets:** Includes 5 high-quality sets covering Tech Metrics, Sales, Sentiment, HR Churn, and Supply Chain.
*   **Import/Export:** Drag-and-drop CSV import and print-to-PDF export functionality.
*   **CRUD Operations:** Create (upload), Read (view), Update (edit cells), Delete reports.

### 3.2 Data Grid & Quality Control
*   **Interactive Table:** High-performance rendering of tabular data.
*   **Smart Editing:** Double-click cells to inline edit values.
*   **Diff View:** Toggle visual highlights showing changes from the original dataset.
*   **Auto-Fix:** "Wand" tool to automatically apply confident fixes (e.g., calculated fields, formatting) based on heuristics.
*   **Validation Rules:** Users can assert specific rules (e.g., "Salary > 0") to flag violations.

### 3.3 Visualization & Stats
*   **Column Stats:** Automatic profiling of every column:
    *   Data Type detection (Number, String, Date, Email, etc.).
    *   Null/Empty counts.
    *   Statistical aggregates (Min, Max, Avg) for numeric fields.
*   **Dynamic Charts:**
    *   Multi-select fields to plot specific data points.
    *   Support for Bar, Line, and Pie charts.
    *   Responsive design using `recharts`.

### 3.4 AI Assistant (DataLens AI)
*   **Deep Scan:** One-click analysis that sends data to Gemini to find hidden patterns or textual anomalies not caught by rule-based validation.
*   **Contextual Chat:** 
    *   "Ask a question": Free-form chat about the active dataset.
    *   State-aware: The AI knows the current file context (name, size, columns).
    *   Drag-and-Drop Context: Users can drag columns or specific cells into the chat to focus the AI's answer.
*   **Error Handling:** Robust handling of API quotas (429) and invalid keys, with user-friendly error messages in the chat interface.

---

## 4. Component Structure

### `src/components/report-analyzer.tsx`
The massive "Brain" component of the application. It orchestrates:
- **State Management:** Holds `activeReport`, `analysis` results, `history` (Undo/Redo), and `chat` state.
- **Layout:** Renders the Sidebar, Main Content Area, and Chat Panel.
- **Tabs System:** Switches between Table, Charts, Stats, and Rules views.
- **Event Handling:** Manages drag-and-drop, keypresses (Ctrl+Z), and form inputs.

### `src/hooks/use-offline-storage.ts`
Custom hook acting as the Data Access Layer (DAL).
- **Responsibility:** Abstraction over `localStorage` and Supabase.
- **Sync Logic:** Checks `navigator.onLine` to determine fetch strategy.
- **Versioning:** Includes logic (`APP_VERSION = '2.2'`) to handle schema migrations or force-resetting default data for clean demos.

### `src/lib/gemini.ts`
The AI Interface layer.
- **Client:** Manages API keys and model selection (`gemini-2.0-flash`).
- **Functions:** 
    - `chatWithGemini`: Formatting history, managing role alternation (User/Model), and error handling.
    - `detectAnomaliesWithGemini`: Constructing specific prompts for JSON-structured anomaly reports.

### `src/lib/supabase.ts`
Simple configuration file initializing the Supabase client with environment variables.

---

## 5. Security & Configuration

### Environment Variables
Managed via `.env.local` (not committed to git):
- `NEXT_PUBLIC_SUPABASE_URL`: Endpoint for the database.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public client key.
- `NEXT_PUBLIC_GEMINI_API_KEY`: Google AI credentials.

### Access Control
- **Database:** Supabase Row Level Security (RLS) policies (implicit in SQL setup) control access.
- **API Keys:** Exposed keys are strictly for client-side demo purposes; production apps should proxy these calls.

---

## 6. Development Workflow

### Setup
1.  **Clone Repository:** Get the files locally.
2.  **Dependencies:** Run `npm install` to grab Next.js, Radix UI, Lucide, Recharts, etc.
3.  **Environment:** Create `.env.local` with necessary API keys.
4.  **Database:** Run `supabase_setup.sql` in the Supabase dashboard to create the `reports` table.
5.  **Run:** `npm run dev` starts the local server on `http://localhost:3000`.

### Recent Updates & Changelog
*   **v2.2 (Current):**
    *   **Cleanup:** Removed legacy specific dashboards.
    *   **UX Polish:** Forced sidebar to strictly show 5 high-quality demo reports.
    *   **Styling:** Custom "dark-scroll" bars for seamlessly integrated UI.
    *   **AI:** Upgraded model references and improved 429/404 error handling.
*   **v2.1:**
    *   Optimized local storage sync.
    *   Added "Deep Scan" functionality.

---

## 7. Future Roadmap

1.  **Server-Side Proxy:** Move Gemini calls to a Next.js API route to hide the API key and implement rate limiting.
2.  **Auth System:** Implement Supabase Auth to support multi-user private workspaces.
3.  **Advanced Charts:** Add Scatter plots and Heatmaps for correlation analysis.
4.  **Export Options:** Feature to export cleaned data back to CSV/Excel.
5.  **Streaming AI:** Implement streaming responses for the chat to improve perceived latency.

---
*Report generated automatically by Antigravity Assistant.*
