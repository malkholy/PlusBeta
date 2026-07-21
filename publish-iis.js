const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'dist');
const destDirMain = path.join(__dirname, 'IIS');
const destDirCandidate = path.join(__dirname, 'IIS_Candidate');

function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  fs.readdirSync(from).forEach(element => {
    const srcPath = path.join(from, element);
    const destPath = path.join(to, element);
    if (fs.lstatSync(srcPath).isDirectory()) {
      copyFolderSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

function deleteFolderRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
}

try {
  console.log('🧹 Cleaning IIS output folders...');
  if (fs.existsSync(destDirMain)) deleteFolderRecursive(destDirMain);
  if (fs.existsSync(destDirCandidate)) deleteFolderRecursive(destDirCandidate);

  // 1. Publish Main IIS Site
  console.log('🚀 Publishing Main App to IIS/ folder...');
  copyFolderSync(srcDir, destDirMain);
  const configSrc = path.join(__dirname, 'web.config');
  if (fs.existsSync(configSrc)) {
    fs.copyFileSync(configSrc, path.join(destDirMain, 'web.config'));
  }

  // 2. Publish Standalone Candidate IIS Site
  console.log('🚀 Publishing Candidate Portal to IIS_Candidate/ folder...');
  copyFolderSync(srcDir, destDirCandidate);

  // Copy candidate.html to index.html so candidate site root opens candidate portal directly
  const candidateHtmlPath = path.join(destDirCandidate, 'candidate.html');
  const candidateIndexDest = path.join(destDirCandidate, 'index.html');
  if (fs.existsSync(candidateHtmlPath)) {
    fs.copyFileSync(candidateHtmlPath, candidateIndexDest);
  }

  // Generate web.config for Candidate IIS site
  const candidateWebConfig = `<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <defaultDocument>
      <files>
        <clear />
        <add value="candidate.html" />
        <add value="index.html" />
      </files>
    </defaultDocument>
    <rewrite>
      <rules>
        <clear />
        <rule name="Candidate Portal SPA Routing" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="candidate.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
`;
  fs.writeFileSync(path.join(destDirCandidate, 'web.config'), candidateWebConfig, 'utf8');

  console.log('\n✅ Successfully published IIS Sites:');
  console.log('   • Main ERP App Site:     ' + destDirMain);
  console.log('   • Candidate Portal Site: ' + destDirCandidate);
} catch (error) {
  console.error('❌ Failed to publish:', error.message);
  process.exit(1);
}
