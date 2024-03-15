const express = require('express');
const multer = require('multer');
const util = require('util');
const fs = require('fs');
const fs1 = require('fs').promises;
const path = require('path');
const {getLocalIPAddress, getUniqueFilePath, formatModifiedTime} = require('./func')


const upload = multer({ dest: 'public/temp' });
const port = 3000;
const rootPath = './public/images'; // 图片根文件夹路径

// 创建目标目录（如果不存在）
if (!fs.existsSync(rootPath)) {
  fs.mkdirSync(rootPath, { recursive: true });
}

const app = express();
app.use(express.static(path.join(__dirname, rootPath)));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 处理图片查看请求的路由
app.get('/', (req, res) => {
  // console.log(req.query.path)
  folderPath = path.join(rootPath, req.query.path?.split(",").join("\\") || '')
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error(err);
      return res.redirect('/');
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

// 处理文件上传请求的路由
app.post('/upload', upload.array('images[]', 1024), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    res.status(400).send('没有选择文件');
    return;
  }

  const files = req.files;
  const targetDirectory = req.query.path === '首页' ? rootPath : path.join(rootPath, req.query.path.split(',').join('\\'));

  if (!fs.existsSync(targetDirectory)) {
    fs.mkdirSync(targetDirectory, { recursive: true });
  }

  try{
    // 创建一个包含所有文件移动操作的promise
    const movePromises = files.map(async (file) => {
      const sourcePath = file.path;
      let targetPath = path.join(targetDirectory, file.originalname);

      while (fs.existsSync(targetPath) && file.originalname.startsWith('tmp_img')) {
        targetPath = getUniqueFilePath(targetDirectory, file.originalname);
      }
      util.promisify(fs.rename)(sourcePath, targetPath);
    });
    
    // 使用 Promise.all 并行执行所有文件移动操作
    await Promise.all(movePromises);
    
    // 所有文件都已移动完毕，现在可以发送响应
    res.sendStatus(200);
  } catch (error) {
    console.error('上传过程中出现错误:', error);
    res.status(500).send("服务器错误");
  }
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

const localIPAddresses = getLocalIPAddress();
app.listen(port, () => {
  console.log(`Server running at http://${localIPAddresses.join(', ')}:${port}`);
});