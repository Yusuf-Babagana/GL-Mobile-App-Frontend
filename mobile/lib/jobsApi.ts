import api from './api'; // The axios instance from mobile/lib/api.ts

export interface JobPosting {
    id: number;
    employer: number;
    employer_name: string;
    title: string;
    description: string;
    requirements: string[];
    budget: string | null;
    currency: string;
    is_negotiable: boolean;
    location: string;
    job_type: 'full_time' | 'part_time' | 'contract' | 'freelance';
    status: 'open' | 'closed' | 'filled';
    application_count: number;
    created_at: string;
}

export interface JobApplication {
    id: number;
    job: number;
    job_title: string;
    seeker: number;
    seeker_name: string;
    seeker_email: string;
    cover_letter: string;
    custom_resume: string | null;
    status: 'applied' | 'interviewing' | 'hired' | 'rejected';
    created_at: string;
}

interface PaginatedResponse<T> {
    count: number;
    total_pages: number;
    page: number;
    page_size: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export const jobsAPI = {
    getJobs: async (search?: string): Promise<PaginatedResponse<JobPosting>> => {
        const response = await api.get('/jobs/list/', {
            params: search ? { search } : {},
        });
        return response.data;
    },

    getJob: async (id: number | string): Promise<JobPosting> => {
        const response = await api.get(`/jobs/${id}/`);
        return response.data;
    },

    applyToJob: async (jobId: number | string, coverLetter: string): Promise<JobApplication> => {
        const response = await api.post(`/jobs/${jobId}/apply/`, {
            cover_letter: coverLetter,
        });
        return response.data;
    },

    getMyApplications: async (): Promise<PaginatedResponse<JobApplication>> => {
        const response = await api.get('/jobs/applications/mine/');
        return response.data;
    },
};
