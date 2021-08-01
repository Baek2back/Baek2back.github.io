import React, { useEffect } from 'react';
import { hasClassOfBody } from '../../utils/helpers';
const src = 'https://utteranc.es/client.js';
const branch = 'master';

export const Utterances = ({ repo }) => {
  const rootElm = React.createRef();

  useEffect(() => {
    const isDarkTheme = hasClassOfBody("dark");
    const utterances = document.createElement('script');
    const utterancesConfig = {
      src,
      repo,
      branch,
      theme: isDarkTheme ? "photon-dark" : 'github-light',
      label: 'comment',
      async: true,
      'issue-term': 'pathname',
      crossorigin: 'anonymous',
    };

    Object.entries(utterancesConfig).forEach(([key, value]) => {
      utterances.setAttribute(key, value);
    });
    
    rootElm.current.appendChild(utterances);
  }, []);

  return <div className="utterances" ref={rootElm} />
    
};
