-- Normalize canonical title variant keys so the base title remains machine-readable.
update public.mindex_canonical_songs
set normalized_title = '예수우리왕이여::ccm'
where id = '30bc1d8a-2cde-4ea0-9ee4-b7bc8ffced00'
  and title = '예수 우리 왕이여'
  and normalized_title = '예수우리왕이여ccm';

update public.mindex_canonical_songs
set normalized_title = '주는나의::하나님이시여'
where id = 'e21e3bfb-2b37-5be4-858f-d960d9b47100'
  and title = '주는 나의...'
  and normalized_title = '주는나의...::하나님이시여';
