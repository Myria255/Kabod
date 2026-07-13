alter table public.library_books
drop constraint if exists library_books_file_type_check;

alter table public.library_books
add constraint library_books_file_type_check
check (file_type in ('pdf', 'epub', 'audio', 'other'));

notify pgrst, 'reload schema';
