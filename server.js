const fs = require('fs');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require("socket.io")(http);

app.use('/', express.static(__dirname + '/src'));

let portrait = fs.readdirSync('./src/static/portrait')
let emoji = fs.readdirSync('./src/static/emoticon/emoji')
let emot = fs.readdirSync('./src/static/emoticon/emot')
app.get('*', (req, res) => {
    const assetsType = req.url.split('/')[1];
    if (assetsType === 'loadImg') {
        res.send({
            code: 0,
            data: {
                portrait,
                emoji,
                emot
            },
            msg: 'Welcome to Om3gle'
        })
    }
})

let userList = [];
let chatGroupList = {};
io.on('connection', (socket) => {

    socket.on('login', (userInfo) => {
        userList.push(userInfo);
        io.emit('userList', userList);

    })

    socket.on('sendMsg', (data) => {
        socket.to(data.id).emit('receiveMsg', data)
    })

    socket.on('sendMsgGroup', (data) => {
        socket.to(data.roomId).emit('receiveMsgGroup', data);
    })

    socket.on('createChatGroup', data => {
        socket.join(data.roomId);

        chatGroupList[data.roomId] = data;
        data.member.forEach(item => {
            io.to(item.id).emit('chatGroupList', data)
            io.to(item.id).emit('createChatGroup', data)

        });
    })


    socket.on('joinChatGroup', data => {
        socket.join(data.info.roomId);
        io.to(data.info.roomId).emit('chatGrSystemNotice', {
            roomId: data.info.roomId,
            msg: data.userName + ' has joined the chat',
            system: true
        });
    })

    socket.on('leave', data => {
        socket.leave(data.roomId, () => {
            let member = chatGroupList[data.roomId].member;
            let i = -1;
            member.forEach((item, index) => {
                if (item.id === socket.id) {
                    i = index;
                }
                io.to(item.id).emit('leaveChatGroup', {
                    id: socket.id,
                    roomId: data.roomId,
                    msg: data.userName + ' has left the chat!',
                    system: true
                })
            });
            if (i !== -1) {
                member.splice(i)
            }
        });
    })

    socket.on('disconnect', () => {
        chatGroupList = {};
        userList = userList.filter(item => item.id != socket.id)
        io.emit('quit', socket.id)
    })
})

const port = process.env.PORT || 5000;

http.listen(port, () => {
    console.log('http://localhost:5000/index.html')
});
