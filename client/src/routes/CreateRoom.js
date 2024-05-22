import React from "react";

const CreateRoom = (props) => {
    function create(e) {
        e.preventDefault();
        const id = e.target[0].value;
        // const id = uuid();
        console.log(props);
        props.history.push(`/room/${id}`)
    }

    return (
        <form onSubmit={create}>
            <input type="text" />
            <button type="submit">Create Room</button>
        </form>
    );
}

export default CreateRoom;