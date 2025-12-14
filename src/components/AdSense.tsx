import React, { useEffect } from 'react';

interface AdSenseProps {
    className?: string;
    style?: React.CSSProperties;
    client?: string; // e.g., ca-pub-XXXXXXXXXXXXXXXX
    slot?: string;
    format?: string;
    responsive?: string;
}

const AdSense: React.FC<AdSenseProps> = ({
    className,
    style,
    client = "ca-pub-XXXXXXXXXXXXXXXX", // Replace with real ID
    slot = "1234567890", // Replace with real Slot ID
    format = "auto",
    responsive = "true"
}) => {
    useEffect(() => {
        try {
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error(e);
        }
    }, []);

    return (
        <div className={className}>
            <ins className="adsbygoogle"
                style={style || { display: 'block' }}
                data-ad-client={client}
                data-ad-slot={slot}
                data-ad-format={format}
                data-full-width-responsive={responsive}></ins>
        </div>
    );
};

export default AdSense;
