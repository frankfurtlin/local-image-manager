const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 获取本地IP地址
const networkInterfaces = os.networkInterfaces();
// console.log(networkInterfaces);
const localIPAddresses = [];
for (const [networkInterfaceName, networkInterfaces1] of Object.entries(networkInterfaces)) {
  if(networkInterfaceName.startsWith("VMware")){
    continue;
  }
  for (const { address, family } of networkInterfaces1) {
    if (family === 'IPv4' && !address.startsWith('127.') && !address.startsWith('::1') && !address.startsWith('fe80')) {
      // 过滤掉本地回环地址、IPv6地址和 Link-local 地址
      localIPAddresses.push(address);
    }
  }
}

const app = express();
const upload = multer({ dest: 'public/temp' });
const port = 3000;
const rootPath = './public/images'; // 图片根文件夹路径

// 创建目标目录（如果不存在）
if (!fs.existsSync(rootPath)) {
  fs.mkdirSync(rootPath, { recursive: true });
}

app.use(express.static(path.join(__dirname, 'public/images')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

function formatModifiedTime(mtime) {
  const date = new Date(mtime);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

app.get('/', (req, res) => {
  // console.log(req.query.path)
  folderPath = path.join(rootPath, req.query.path?.split(",").join("\\") || '')
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server Error');
    }

    const fileData = {
      dirs: [],
      files: []
    };

    files.forEach((file) => {
      const filePath = path.join(folderPath, file);
      const stats = fs.statSync(filePath);
      const fileInfo = {
        name: file,
        mtime: formatModifiedTime(stats.mtime),
        type: stats.isDirectory() ? 'folder' : 'file',
        path: path.join(req.query.path?.split(",").join("\\") || '', file), // 添加文件路径信息
      };

      if (stats.isDirectory()) {
        fileData.dirs.push(fileInfo);
      } else {
        fileData.files.push(fileInfo);
      }
    });

    // console.log(fileData)

    // 将文件夹列表和文件列表传递给前端页面作为数据
    res.render('index', { dirs: fileData.dirs, files: fileData.files, title: (req.query.path?.split(",").join("/") || '首页') });
  });
});

// 生成5位随机字符串
function generateRandomString(length) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = length; i > 0; --i) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// 构建唯一的目标文件名
function getUniqueFilePath(targetDirectory, originalName) {
  const randomString = generateRandomString(5); // 生成5位随机字符串
  const uniqueFilename = `${originalName.split(".")[0]}${randomString}.${originalName.split(".")[1]}`;
  const uniquePath = path.join(targetDirectory, uniqueFilename);
  return uniquePath;
}

// 处理文件上传请求的路由
app.post('/upload', upload.array('images[]', 128), (req, res) => {
  // console.log(req.query.path)
  if (!req.files || req.files.length == 0) {
    res.status(400).send('没有选择文件');
    return;
  }

  // 获取上传的文件信息
  const files = req.files;
  files.forEach(file => {
    const originalName = file.originalname;
    const tempPath = file.path;

    // 指定保存的目录和文件名
    let targetDirectory = ''
    if(req.query.path == "首页"){
      targetDirectory = "public\\images";
    }
    else{
      targetDirectory = path.join('public\\images', req.query.path.split(",").join("\\"));
    }
    // const targetDirectory = 'uploads/images/';
    const targetFilename = originalName;

    // 创建目标目录（如果不存在）
    if (!fs.existsSync(targetDirectory)) {
      fs.mkdirSync(targetDirectory, { recursive: true });
    }

    // 构建目标路径
    let targetPath = path.join(targetDirectory, targetFilename);

    while (fs.existsSync(path.join(targetPath)) && targetFilename.startsWith("tmp_img")) {
      targetPath = getUniqueFilePath(targetDirectory, targetFilename);
    }

    // 将文件从临时路径移动到目标路径
    fs.renameSync(tempPath, targetPath);
  })

  res.sendStatus(200);
});

// 处理新建文件夹请求的路由
app.post('/create', (req, res) => {
  let folderPath;
  if(req.query.path == "首页"){
    folderPath = rootPath;
  }
  else{
    folderPath = path.join(rootPath, req.query.path?.split(",").join("\\") || '')
  }
  const folderName = req.query.folder
  const newFolderPath = path.join(folderPath, folderName);

  fs.mkdir(newFolderPath, { recursive: true }, (err) => {
    if (err) {
      console.error('创建文件夹失败:', err);
      res.status(500).send('创建文件夹失败');
    } else {
      // console.log(`创建文件夹成功: ${newFolderPath}`);
      res.status(200).end();
    }
  });
});

app.listen(port, () => {
  console.log(`Server running at http://${localIPAddresses.join(', ')}:${port}`);
});