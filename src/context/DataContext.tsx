/**
 * DataContext (Formerly AirtableContext)
 * 
 * 100% decoupled from Airtable.
 * Backed exclusively by Supabase with real-time transactional reactivity.
 */
export * from './AirtableContext';
export { useAirtable as useData, AirtableProvider as DataProvider } from './AirtableContext';
