import React, { useState } from "react";

const Message = ({ text }) => {
    if (!text) {
        return false;
    }
    return (
        <div className="message">
            { text }
        </div>
    )
}

export default Message;
