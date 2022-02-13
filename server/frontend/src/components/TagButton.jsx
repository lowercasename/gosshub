import React from 'react';
import { Link } from 'wouter';

export default ({ slug }) => {
    return <Link href={`/tag/${slug}`}><a className='gh-tag'>{slug}</a></Link>
}
