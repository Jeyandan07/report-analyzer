import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const DATA_DIR = path.join(process.cwd(), 'src/data');

export interface ProjectStatus {
    ProjectID: string;
    ProjectName: string;
    WeekEnding: string;
    RAG_Status: string;
    Completion_Percent: string;
    Blockers_Count: string;
    Budget_Usage_Percent: string;
    Risk_Flag: string;
    Update_Summary: string;
}

export interface SentimentData {
    SurveyID: string;
    Date: string;
    Department: string;
    Satisfaction_Score: string;
    Work_Life_Balance: string;
    Feedback_Comment: string;
}

export function getProjectStatus(): ProjectStatus[] {
    const filePath = path.join(DATA_DIR, 'project_status.csv');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return parse(fileContent, {
        columns: true,
        skip_empty_lines: true
    });
}

export function getEmployeeSentiment(): SentimentData[] {
    const filePath = path.join(DATA_DIR, 'employee_sentiment.csv');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return parse(fileContent, {
        columns: true,
        skip_empty_lines: true
    });
}

export function getMeetingMinutes(): string {
    const filePath = path.join(DATA_DIR, 'meeting_minutes.txt');
    return fs.readFileSync(filePath, 'utf-8');
}
