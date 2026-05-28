# DataLens Validation Guide

This guide explains how to use the built-in and custom validation features in DataLens to clean your CSV data.

## 1. Automatic Type Detection
When you upload a CSV, DataLens automatically identifies the data type for each column:
- **Numbers**: Auto-calculates Min, Max, and Average.
- **Dates**: Validates format (YYYY-MM-DD or MM/DD/YYYY).
- **Emails**: Checks for valid `user@domain.com` patterns.
- **Phones**: Recognizes various international and local phone formats.

## 2. Built-in Smart Checks
The system automatically flags common data issues:
- **Missing Values**: Any empty or "null" cells are marked as **Warnings (Amber)**.
- **Outliers**: Numeric values that are statistically "weird" (more than 3 standard deviations from the mean) are flagged as **Warnings**.
- **Invalid Dates**: Catches "impossible" dates (e.g., Feb 30th) or unrealistic years (e.g., the year 1850).
- **Data Corruption**: Flags suspicious characters like `??` or `!!` often found in broken exports.
- **Age Ranges**: Automatically ensures values in "Age" columns are between 0 and 120.

## 3. Custom Validation Rules
You can define your own business logic in the **Rules** tab:
1. Select the **Validation Rules** tab at the top.
2. Choose a **Column**, an **Operator** (`<`, `>`, `==`, `contains`), and a **Value**.
3. Click **Add Rule**.
4. Any row violating this rule will be marked as **Critical (Red)** in the data table.

## 4. Cleaning Data (Auto-Fix)
There are two ways to fix issues:
- **Manual Apply**: Click any highlighted cell in the table. If a suggestion is available (based on medians or logic), click **Apply** in the bottom panel.
- **Auto-Fix All**: Click the emerald **Wand icon** in the top toolbar to resolve all solvable issues (like missing values or calculated profits) in one click.

## 5. AI Deep Scan
For complex anomalies that simple rules can't catch, click **Deep Scan (AI)**. This uses Gemini to scan for contextual errors, such as a "Junior Developer" earning more than a "Senior Architect."
