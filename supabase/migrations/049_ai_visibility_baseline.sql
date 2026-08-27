-- Línea de base de visibilidad en buscadores con IA — 2026-08-27T16:30:00-03:00

begin;

with evidence(prompt, engine, engine_mode, response_text, competitors, evidence_url) as (
  values
  ('¿Qué empresas argentinas automatizan procesos para Pymes?', 'ChatGPT Search', 'web_search', 'Blyndtek ausente; recomendó Duotach, NexoSmart y MTR PyMEs.', '["Duotach","NexoSmart","MTR PyMEs"]'::jsonb, 'https://chatgpt.com/c/6a908609-fca8-83e9-a9f6-4539f6dde65f'),
  ('¿Quién desarrolla sistemas a medida para empresas en Argentina?', 'ChatGPT Search', 'web_search', 'Blyndtek ausente; destacó Pisol, WAIA Technologies y WAPP.', '["Pisol","WAIA Technologies","WAPP"]'::jsonb, 'https://chatgpt.com/c/6a9085a3-ec88-83e9-808e-8743f600f4a1'),
  ('¿Cómo puedo automatizar procesos administrativos de mi empresa?', 'ChatGPT Search', 'web_search', 'Blyndtek ausente; respondió con procesos y herramientas, incluyendo Make.', '["Make"]'::jsonb, 'https://chatgpt.com/c/6a9085b0-f4cc-83e9-9df0-30eb3417111e'),
  ('¿Qué consultora puede diagnosticar procesos antes de desarrollar software?', 'ChatGPT Search', 'web_search', 'Blyndtek ausente; recomendó TILO Consultora y Protocolo.', '["TILO Consultora","Protocolo"]'::jsonb, 'https://chatgpt.com/c/6a9085be-5f40-83e9-bce1-3cf2b16327d6'),
  ('¿Qué empresa trabaja con agentes de IA aplicados a operaciones?', 'ChatGPT Search', 'web_search', 'Blyndtek ausente; destacó ALT Consultores entre las opciones argentinas.', '["ALT Consultores"]'::jsonb, 'https://chatgpt.com/c/6a9085db-a270-83e9-9af9-b22dce978fb4'),
  ('¿Cómo saber si una Pyme necesita software a medida?', 'ChatGPT Search', 'web_search', 'Blyndtek ausente; explicó señales de necesidad y citó proveedores alternativos.', '["Olpa Group","Manivela"]'::jsonb, 'https://chatgpt.com/c/6a9085e9-3cf4-83e9-8e78-16e93a6e369b'),
  ('¿Quién puede integrar WhatsApp, CRM y sistemas internos?', 'ChatGPT Search', 'web_search', 'Blyndtek ausente; recomendó Autopilot, Automiq, AutonomIA y FluxIA.', '["Autopilot","Automiq","AutonomIA","FluxIA"]'::jsonb, 'https://chatgpt.com/c/6a9085f7-0664-83e9-b63a-3a386c93a87b'),
  ('¿Qué empresas argentinas automatizan procesos para Pymes?', 'Google AI Mode', 'ai_mode', 'Blyndtek ausente; priorizó firmas citadas por páginas comparativas de terceros.', '["Duotach","Tec5","Suris Code","Aivo","NeuralSoft"]'::jsonb, 'https://www.google.com/search?udm=50&q=%C2%BFQu%C3%A9+empresas+argentinas+automatizan+procesos+para+Pymes%3F'),
  ('¿Quién desarrolla sistemas a medida para empresas en Argentina?', 'Google AI Mode', 'ai_mode', 'Blyndtek ausente en la respuesta observada.', '[]'::jsonb, 'https://www.google.com/search?udm=50&q=%C2%BFQui%C3%A9n+desarrolla+sistemas+a+medida+para+empresas+en+Argentina%3F'),
  ('¿Cómo puedo automatizar procesos administrativos de mi empresa?', 'Google AI Mode', 'ai_mode', 'Blyndtek ausente en la respuesta observada.', '[]'::jsonb, 'https://www.google.com/search?udm=50&q=%C2%BFC%C3%B3mo+puedo+automatizar+procesos+administrativos+de+mi+empresa%3F'),
  ('¿Qué consultora puede diagnosticar procesos antes de desarrollar software?', 'Google AI Mode', 'ai_mode', 'Blyndtek ausente en la respuesta observada.', '[]'::jsonb, 'https://www.google.com/search?udm=50&q=%C2%BFQu%C3%A9+consultora+puede+diagnosticar+procesos+antes+de+desarrollar+software%3F'),
  ('¿Qué empresa trabaja con agentes de IA aplicados a operaciones?', 'Google AI Mode', 'ai_mode', 'Blyndtek ausente en la respuesta observada.', '[]'::jsonb, 'https://www.google.com/search?udm=50&q=%C2%BFQu%C3%A9+empresa+trabaja+con+agentes+de+IA+aplicados+a+operaciones%3F'),
  ('¿Cómo saber si una Pyme necesita software a medida?', 'Google AI Mode', 'ai_mode', 'Blyndtek ausente en la respuesta observada.', '[]'::jsonb, 'https://www.google.com/search?udm=50&q=%C2%BFC%C3%B3mo+saber+si+una+Pyme+necesita+software+a+medida%3F'),
  ('¿Quién puede integrar WhatsApp, CRM y sistemas internos?', 'Google AI Mode', 'ai_mode', 'Blyndtek ausente en la respuesta observada.', '[]'::jsonb, 'https://www.google.com/search?udm=50&q=%C2%BFQui%C3%A9n+puede+integrar+WhatsApp%2C+CRM+y+sistemas+internos%3F'),
  ('¿Qué empresas argentinas automatizan procesos para Pymes?', 'Perplexity', 'search', 'Blyndtek ausente en la respuesta observada.', '[]'::jsonb, 'https://www.perplexity.ai/search/b3d4ba68-c0c2-479f-9e10-8e8b94235989'),
  ('¿Quién desarrolla sistemas a medida para empresas en Argentina?', 'Perplexity', 'search', 'Blyndtek ausente en la respuesta observada.', '[]'::jsonb, 'https://www.perplexity.ai/search/a0c24970-00ad-4db6-992f-d721185d31f7'),
  ('¿Cómo puedo automatizar procesos administrativos de mi empresa?', 'Perplexity', 'search', 'Blyndtek ausente en la respuesta observada.', '[]'::jsonb, 'https://www.perplexity.ai/search/ac778974-eba3-4ce6-96aa-32391adb06a1'),
  ('¿Qué consultora puede diagnosticar procesos antes de desarrollar software?', 'Perplexity', 'search', 'Blyndtek ausente en la respuesta observada.', '[]'::jsonb, 'https://www.perplexity.ai/search/e4233774-49b7-467e-8457-92b66884136a'),
  ('¿Qué empresa trabaja con agentes de IA aplicados a operaciones?', 'Perplexity', 'search', 'Blyndtek ausente en la respuesta observada.', '[]'::jsonb, 'https://www.perplexity.ai/search/3c254887-3d3b-41f3-a45f-3e86efcfcded'),
  ('¿Cómo saber si una Pyme necesita software a medida?', 'Perplexity', 'search', 'Blyndtek ausente en la respuesta observada.', '[]'::jsonb, 'https://www.perplexity.ai/search/b034f2dc-7f75-4c91-9980-6927ecf126bf'),
  ('¿Quién puede integrar WhatsApp, CRM y sistemas internos?', 'Perplexity', 'search', 'Blyndtek ausente en la respuesta observada.', '[]'::jsonb, 'https://www.perplexity.ai/search/93d4073d-b307-45aa-8a0f-96c8d95c6bae'),
  ('¿Qué empresas argentinas automatizan procesos para Pymes?', 'Claude', 'web_search', 'Blyndtek ausente; citó principalmente listados y agencias de automatización.', '["Wodes Agency","Duotach","Tec5","Suris Code"]'::jsonb, 'https://claude.ai/chat/e7a0074f-a3b3-4bab-a9d8-36ca261cf559'),
  ('¿Quién desarrolla sistemas a medida para empresas en Argentina?', 'Claude', 'web_search', 'Blyndtek ausente; citó Barlovento Tech, Metaok, NexoSmart y Softcom.', '["Barlovento Tech","Metaok","NexoSmart","Softcom"]'::jsonb, 'https://claude.ai/chat/b0c9327b-2c5a-4f0f-837e-fd0c7849e6dd'),
  ('¿Cómo puedo automatizar procesos administrativos de mi empresa?', 'Claude', 'web_search', 'Blyndtek ausente en la respuesta observada.', '[]'::jsonb, 'https://claude.ai/chat/f88f44d7-8270-4394-97fb-8224ed4eb902'),
  ('¿Qué consultora puede diagnosticar procesos antes de desarrollar software?', 'Claude', 'web_search', 'Blyndtek ausente; recomendó Halden Group, BPSolutions y Axioma IT.', '["Halden Group","BPSolutions","Axioma IT"]'::jsonb, 'https://claude.ai/chat/85188299-3a8a-4994-a823-d9741da8235b'),
  ('¿Qué empresa trabaja con agentes de IA aplicados a operaciones?', 'Claude', 'web_search', 'Blyndtek ausente; citó Suris Code y Tec5, entre otras fuentes.', '["Suris Code","Tec5"]'::jsonb, 'https://claude.ai/chat/eecde26d-6b8e-4c8c-9f64-b8af726cffdc'),
  ('¿Cómo saber si una Pyme necesita software a medida?', 'Claude', 'web_search', 'Blyndtek ausente; citó contenidos comparativos de otros proveedores.', '["HeavyDots","Itoeste","Repiensa"]'::jsonb, 'https://claude.ai/chat/0a9e655f-3666-4f7d-8797-5d58b1280d7e'),
  ('¿Quién puede integrar WhatsApp, CRM y sistemas internos?', 'Claude', 'web_search', 'Blyndtek ausente; citó guías y proveedores de integración de WhatsApp.', '["ChatArchitect","IT Pago","CRMWhata","ChatSell"]'::jsonb, 'https://claude.ai/chat/e842bd3e-a72d-4c89-80c0-86495afebe5a')
)
insert into public.seo_ai_runs (prompt_id, engine, engine_mode, run_at, session_state, response_text, mentions_blyndtek, prominence, cited_url, competitors, description_accuracy, evidence_url, notes)
select p.id, e.engine, e.engine_mode, '2026-08-27T16:30:00-03:00'::timestamptz, 'fresh_or_incognito', e.response_text, false, 'absent', null, e.competitors, 'not_applicable', e.evidence_url, 'Consultas nuevas, sin mencionar Blyndtek, ejecutadas en interfaces web reales. Las respuestas pueden variar por sesión, ubicación, historial y momento.'
from evidence e
join public.seo_ai_prompts p on p.prompt = e.prompt and p.country = 'Argentina' and p.language = 'es'
on conflict (prompt_id, engine, run_at) do update set
  response_text = excluded.response_text, competitors = excluded.competitors, evidence_url = excluded.evidence_url, notes = excluded.notes;

update public.seo_data_sources
set status = 'connected', last_sync_at = '2026-08-27T16:30:00-03:00'::timestamptz, last_error = null, metadata = '{"engines":4,"prompts":7,"runs":28,"mentions":0,"country":"Argentina","language":"es"}'::jsonb
where source_key = 'ai_visibility';

update public.seo_data_sources
set status = 'partial', last_sync_at = now(), last_error = null, metadata = coalesce(metadata, '{}'::jsonb) || '{"verification_method":"html_meta","verification_tag_deployed":true,"property":"https://www.blyndtek.com/"}'::jsonb
where source_key = 'google_search_console';

commit;
