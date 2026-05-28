# Report Analyzer - Advanced AI-Powered Data Analysis Tool

The Report Analyzer is a sophisticated, browser-based application designed to bring powerful data analysis, validation, and visualization capabilities directly to your desktop. Built with **Next.js**, **React**, and **TypeScript**, it combines intuitive design with advanced AI features to streamline data workflows.

## 🚀 Key Features

### 1. Smart Data Processing & Analysis
- **CSV Import**: Easily upload CSV files via drag-and-drop or file selection.
- **Automated Analysis**: Instantly scans your data for irregularities.
  - Detects **Missing Values** and **Nulls**.
  - Identifies **Suspicious Characters** (`??`, `!!`, etc.).
  - Validates **Data Types** (Number, Date, Email, Phone).
  - Checks logic (e.g., specific rules for Profit/Revenue/Cost).
- **Column Statistics**: Automatically computes Min, Max, Average, and Null Counts for every column.

### 2. Intelligent Correction Tools
- **Auto-Fix Engine**: Apply suggested fixes for critical issues with a single click.
  - Smart logic for Profit/Revenue/Cost calculations.
  - Heuristic-based fixes for Age and other fields (Median/Mode fallbacks).
- **Inline Editing**: Double-click any cell to modify data instantly.
- **Validation Rules**: Create custom logical rules (e.g., `Value < 100`, `Score > 50`) to flag data row-by-row.
- **Diff View**: Visually compare your current data against the original imported dataset (Red strike-through for old, Green for new).
- **Undo/Redo**: Full history support to revert or re-apply changes safely.

### 3. Integrated AI Assistant 🤖
Interact with your data using natural language.
- **Context-Aware Chat**: Drag specific cells or entire columns directly into the chat window to ask questions about that data point.
- **Smart Suggestions**: The AI proactively suggests fixes, chart configurations, and export options.
- **Data Insights**: Ask the AI to "analyze trends", "summarize issues", or "suggest improvements".

### 4. Interactive Visualization 📊
Visualize your data without complex configurations.
- **Dynamic Charts**: Switch between **Bar**, **Line**, and **Pie** charts instantly.
- **Multi-Select**: Compare multiple numeric columns on the same chart.
- **Interactive Tooltips**: Hover over data points for detailed insights.
- **Customizable**: Select specific fields to visualize via a dropdown checklist.

### 5. Seamless User Experience
- **Offline-First Architecture**: Your data is stored securely in your browser's local storage. No data is sent to external servers unless configured.
- **Drag & Drop Reordering**: Organize your data table by dragging column headers.
- **Responsive Sidebar**: Manage multiple active reports and datasets easily.
- **Status Indicator**: Visual feedback for online/offline status.

### 6. Export Capabilities
- **PDF Reports**: Generate professional, print-ready reports directly from the browser.
- **Clean Data Export**: (Planned) Export your cleaned and validated dataset back to CSV.

## 🛠 Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (React 19)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with `shadcn/ui` components.
- **Charts**: [Recharts](https://recharts.org/) for responsive data visualization.
- **Data Parsing**: `PapaParse` for robust CSV handling.
- **Icons**: `Lucide React` for a clean, modern interface.
- **State Management**: Custom React Hooks with LocalStorage persistence.

## 📦 Installation & Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/mrcupidyo/report_analyer.git
    cd report_analyer
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```

4.  **Open the app**:
    Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 How to Use

1.  **Import Data**: Click "Import CSVs" in the sidebar or rely on the default datasets provided.
2.  **Analyze**: Review the "Data Table" tab. Issues are highlighted in Red (Critical) or Yellow (Warning).
3.  **Fix**: 
    - Click **Auto-Fix All** to resolve high-confidence issues.
    - Double-click cells to edit manually.
4.  **Visualize**: Switch to the "Visualize" tab, select chart type, and choose columns to graph.
5.  **Validate**: Go to the "Validation Rules" tab to add custom constraints (e.g., `Age > 18`).
6.  **Chat**: Open the AI Assistant, drag a column header into the chat, and ask "What is the average of this column?".

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
