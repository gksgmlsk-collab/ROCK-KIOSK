# 석암키오스크

초등학교 공용 기기용 아침 걷기 인증 웹앱 프로토타입입니다. 학생 단계형 인증, 최초 등록코드/PIN 설정, PIN 잠금, 하루 한 번 기록, 자동 초기화, 관리자 대시보드를 포함합니다.

## 실행

```bash
npm install
npm run dev
```

- 키오스크: `/`
- 관리자: `/admin` (`.env`의 `VITE_ADMIN_PASSWORD` 설정 필요)
- 학생 초기 등록코드는 실행 시 무작위로 생성되며 관리자 화면에서 확인합니다.

현재 화면은 메모리 기반 데모 저장소를 사용하므로 새로고침하면 초기화됩니다. 실제 운영 시 `supabase/schema.sql`을 적용하고, 학생 인증·PIN 해시 검증·걷기 저장을 Supabase Edge Function에서 처리해야 합니다. PIN과 service-role key를 브라우저에 저장하지 마세요.
