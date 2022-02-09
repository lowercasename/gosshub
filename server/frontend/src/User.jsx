import React, { useState, useEffect } from "react";
import { apiCall } from './util';

const User = ({ username }) => {
    const [user, setUser] = useState(false);
    
    useEffect(() => {
        apiCall(`/user?username=${username}`, true)
            .then(data => setUser(data[0]))
            .catch(error => console.log(error))
    }, [])

    return (user &&
        <article className="user">
            <h2>{ user.username }</h2>
            <p>Joined { new Date(user.join_date).toLocaleDateString() }</p>
        </article>
    )
}

export default User;
