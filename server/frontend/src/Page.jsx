import React, { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import { apiCall } from './util';

const Page = ({ slug }) => {
    const [page, setPage] = useState(false);
    useEffect(() => {
        apiCall(`/page?slug=${slug}`).then(data => setPage(data))
    }, [])
    return (page &&
        <>
            <h2>{ page.title }</h2>
            <ReactMarkdown>{ page.body }</ReactMarkdown>
        </>
    );
}

export default Page;
