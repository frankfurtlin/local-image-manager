const path = require('path');
const os = require('os');

// 获取本机局域网I地址
function getLocalIPAddress() {
	const networkInterfaces = os.networkInterfaces();
	const localIPAddresses = [];
	for (const [networkInterfaceName, networkInterfaces1] of Object.entries(networkInterfaces)) {
		// 排除虚拟机
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
	return localIPAddresses;
}

// 格式化时间
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

module.exports = {
  getLocalIPAddress,
  getUniqueFilePath,
  formatModifiedTime
};