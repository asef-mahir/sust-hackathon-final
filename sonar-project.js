const scanner = require('sonarqube-scanner').default;

scanner(
  {
    serverUrl: 'http://localhost:9000',
    options: {
      'sonar.projectKey': 'team_hope',
      'sonar.login': 'sqp_24a63ccd867142707ca6601aa7f593ac7ec8e264', // <-- Changed to sonar.login
      'sonar.sources': '.',
      'sonar.exclusions': '.next/**, node_modules/**, public/**',
    },
  },
  () => process.exit()
);