export interface InspireHEPData {
    title: string;
    authors: string[];
    abstract: string;
    year: number;
    doi: string;
}

export interface SearchParams {
    query: string;
    yearRange?: [number, number];
    author?: string;
}