import React, { useState } from "react";
import { useLocation, Link } from "wouter";

const Document = ({ document }) => {
    const [location, setLocation] = useLocation();
    const { uuid, body, created_by, edited_date, last_edited_by } = document;
    const formattedDate = new Date(edited_date);
    return (
        <article className="document">
            <main>
                { body }
            </main>
            <footer>
                <div className="document__meta">
                    <i className="far fa-user-circle"></i> <Link to={`/user/${last_edited_by}`}>{ last_edited_by }</Link> on { formattedDate.toLocaleDateString() }
                </div>
                <div className="document__controls">
                    <button className="document__button" onClick={() => setLocation(`/document/${uuid}`)}><i className="far fa-eye"></i></button>
                    <button className="document__button"><i className="far fa-pencil"></i></button>
                </div>
            </footer>
        </article>
    )
}

export default Document;
