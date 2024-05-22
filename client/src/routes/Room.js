import React, { useRef, useEffect, useState } from "react";
import io from "socket.io-client";

const Room = (props) => {
    const userVideo = useRef();
    const partnerVideo = useRef();
    const curRef = useRef();
    const otherUser = useRef();
    const socketRef = useRef();
    const userStream = useRef();

    useEffect(() => {
        navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
        }).then(handleMediaStream)
            .catch(err => {
                console.log(err);
            })
    }, []);

    function handleRoom(roomId) {
        alert("Limit Reached")
    }

    const handleMediaStream = (stream => {
        userVideo.current.srcObject = stream;
        userStream.current = stream;

        socketRef.current = io.connect('/')

        socketRef.current.emit("join room", props.match.params.roomID);

        socketRef.current.on('other user', userID => {
            callUser(userID);
            otherUser.current = userID;
        });

        socketRef.current.on("offer", handleReceiveCall);

        socketRef.current.on("answer", handleAnswer);

        socketRef.current.on("ice-candidate", handleNewICECandidateMsg);

        socketRef.current.on("limit-reached", handleRoom)
    })

    function callUser(userID) {
        curRef.current = createPeer(userID);
        userStream.current.getTracks().forEach(track => curRef.current.addTrack(track, userStream.current));
    }

    function createPeer(userID) {

        const peer = new RTCPeerConnection({
            iceTransportPolicy: "all",
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                {
                    urls: "turn:10.252.73.50",
                    username: "webrtc", credential: "firefox"
                }]
        });


        peer.onicecandidate = handleICECandidateEvent;
        peer.ontrack = handleTrackEvent;
        peer.onnegotiationneeded = () => handleNegotiationNeededEvent(userID);
        return peer;
    }

    function handleNegotiationNeededEvent(userID) {
        curRef.current.createOffer()
            .then(offer => {
                return curRef.current.setLocalDescription(offer);
            })
            .then(() => {
                const payload = {
                    target: userID,
                    caller: socketRef.current.id,
                    sdp: curRef.current.localDescription
                };
                socketRef.current.emit("offer", payload);
            }).catch(e => console.log(e));
    }

    function handleReceiveCall(incoming) {
        curRef.current = createPeer();
        const desc = new RTCSessionDescription(incoming.sdp);
        curRef.current.setRemoteDescription(desc).then(() => {
            userStream.current.getTracks().forEach(track => curRef.current.addTrack(track, userStream.current));
        }).then(() => {
            return curRef.current.createAnswer();
        }).then(answer => {
            return curRef.current.setLocalDescription(answer);
        }).then(() => {
            const payload = {
                target: incoming.caller,
                caller: socketRef.current.id,
                sdp: curRef.current.localDescription
            }
            socketRef.current.emit("answer", payload);
        })
    }

    function handleAnswer(message) {
        const desc = new RTCSessionDescription(message.sdp);
        curRef.current.setRemoteDescription(desc).catch(e => console.log(e));
    }

    function handleICECandidateEvent(e) {
        if (e.candidate) {
            const payload = {
                target: otherUser.current,
                candidate: e.candidate,
            }
            socketRef.current.emit("ice-candidate", payload);
        }
    }

    function handleNewICECandidateMsg(incoming) {
        // console.log("The ice candidate issss", incoming, socketRef.current, curRef.current);
        const candidate = new RTCIceCandidate(incoming);

        curRef.current.addIceCandidate(candidate)
            .catch(e => console.log(e));
    }

    function handleTrackEvent(e) {
        partnerVideo.current.srcObject = e.streams[0];
    };

    return (
        <>
            <div style={{ width: "100", height: "90vh", position: "relative" }}>
                <video autoPlay style={{ width: "30%", height: "30%", position: "absolute", right: "10px", bottom: "10px" }} ref={userVideo} />
                <video autoPlay style={{ height: "100%" }} ref={partnerVideo} />
            </div>
        </>

    );
};

export default Room;