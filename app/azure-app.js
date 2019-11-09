const server = require('http').createServer();
const io = require('socket.io')(server);
io.on('connection', client => {
  client.on('event', data => { /* … */ });
  client.on('disconnect', () => { /* … */ });
});
server.listen(3000);


const kinect = require('node_kinect')
const signalServer = require('simple-signal-server')(io)

const Peer = require('simple-peer')
const wrtc = require('wrtc')

// for signal server
const allIDs = new Set()
let peer;

const dWidth = 320 
const dHeight = 288

let myDevice = new kinect.AzureKinectDeviceWrapper(1)

let canvas, context
let processing = false

let depthInterval, depthData

function initPeer() {



    console.log('init server')
    signalServer.on('discover', (request) => {
      const clientID = request.socket.id // you can use any kind of identity, here we use socket.id
      allIDs.add(clientID) // keep track of all connected peers
      request.discover(clientID, Array.from(allIDs)) // respond with id and list of other peers
    })
    
    signalServer.on('disconnect', (socket) => {
      const clientID = socket.id
      allIDs.delete(clientID)
    })
    
    signalServer.on('request', (request) => {
      request.forward() // forward all requests to connect
    })





    // console.log('initializing peer')
    // let peer = new Peer({initiator:true})

    // // peer = Peer({initiator: true, trickle: false, iceTransportPolicy: 'relay', reconnectTimer: 3000, config : { iceServers: JSON.parse(ice_servers)}});

    // console.log(peer);
    // peer.on('error', err => console.log('error', err))

    // peer.on('signal', data => {
    //   console.log('SIGNAL', JSON.stringify(data))
    //   document.querySelector('#outgoing').textContent = JSON.stringify(data)
    // })

    // document.querySelector('form').addEventListener('submit', ev => {
    //   ev.preventDefault()
    //   p.signal(JSON.parse(document.querySelector('#incoming').value))
    // })

    // peer.on('connect', () => {
    //   console.log('CONNECT')
    //   p.send('whatever' + Math.random())
    // })

    // peer.on('data', data => {
    //   console.log('data: ' + data)
    // })



}

function openKinect() {
    console.log('opening kinect')

    let code = myDevice.openDevice()
    
    if(code != 0 ){
        process.exit()
    } 

    //Configure device
    myDevice.configureDepthMode(1)
    myDevice.configureFPS(15)

    myDevice.startCameras()

    //console.log(`Start Cameras Code: ${myDevice.startCameras()}`)
    //console.log(`GetFrame Code: ${myDevice.getFrame()}`)
    
} 


function startDepth() {
    console.log('start d')

    // 33 for 30fps 
    depthInterval = setInterval(runDepthFeed, 33)

}

function runDepthFeed() {
    
    myDevice.getFrame()    
    depthData = myDevice.getDepthData()
    drawDepthData(depthData)

    myDevice.releaseImageAndCamera()
}


function drawDepthData(inDepth) {
    // don't allow more than one image to process at once
    if (processing) {
        return
    } 
    
    processing = true

    let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
      
    let j = 0

    for (let i = 0; i < data.length; i += 4) {

        // map depth (0-5460mm) to grayscale (0-255)
        let newPixel = inDepth[j] * 255 / 3860

        data[i]     = newPixel;     // red
        data[i + 1] = newPixel; // green
        data[i + 2] = newPixel; // blue
        data[i + 3] = newPixel;

        // iterate through depth buffer one at a time
        j+=1
    }
    
    context.putImageData(imageData, 0, 0);

    // flip processing boolean when complete    
    processing = false
}

function stopDepth() {

    console.log('closing kinect')
    
    clearInterval(depthInterval)

    myDevice.releaseImageAndCamera()
    myDevice.stopCameras()
    
}

function init() {
    
    document.getElementById('startD').addEventListener('click', startDepth)
    document.getElementById('stopD').addEventListener('click', stopDepth)

    canvas = document.getElementById('input-canvas')
    context = canvas.getContext('2d')

    initPeer();
    openKinect()


}

window.addEventListener('load', init)
