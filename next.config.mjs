/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // MDX 파일은 fs로 읽으므로 서버리스 번들에 content 폴더를 포함시킨다
  experimental: {
    outputFileTracingIncludes: {
      '/**/*': ['./src/content/**/*'],
    },
  },
};

export default nextConfig;
