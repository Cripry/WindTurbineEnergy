import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { CategoryScale } from 'chart.js';
import Chart from 'chart.js/auto';
import { Container } from '@mui/material';
Chart.register(CategoryScale);

interface ITableData {
    id: number;
    RotorSpeedRpmAvg: number;
    WindSpeedAvg: number;
    ActivePowerAvg: number;
    NacellePositionAvg: number;
    Feature1: number;
    Feature3: number;
    Feature7: number;
    Feature28: number;
    DaySin: number;
    DayCos: number;
    YearSin: number;
    YearCos: number;
    HourSin: number;
    HourCos: number;
    MinuteSin: number;
    MinuteCos: number;

}

interface IPredictFutureResponse {
    predictions: number[];
    status: string;
}

const getDataPast = async (take: number = 96): Promise<ITableData[]> => {
    const res = await fetch(`http://localhost:3000/api/data?take=${take}`, {
        cache: "no-store",
    });
    if (!res.ok) {
        throw new Error("Failed!");
    }
    return res.json();
};

const getActivePowerAvgDataPast = async (take: number = 96): Promise<number[]> => {
    const tableData: ITableData[] = await getDataPast(take);
    return tableData.map(data => data.ActivePowerAvg);
};

const getDataFuture = async (): Promise<IPredictFutureResponse> => {
    const res = await fetch(`http://localhost:5000/predict_future`, {
        cache: "no-store",
        mode: 'cors',
        method: 'GET',
    });
    if (!res.ok) {
        throw new Error("Failed!");
    }
    return res.json();
};

const getActivePowerAvgDataFuture = async (): Promise<number[]> => {
    try {
        const data: IPredictFutureResponse = await getDataFuture();
        if (data.status === 'success' && Array.isArray(data.predictions)) {
            return data.predictions;
        } else {
            console.error("Failed to get ActivePowerAvg data: Invalid format");
            return [];
        }
    } catch (error) {
        console.error("Failed to get ActivePowerAvg data:", error);
        return [];
    }
};



const Dashboard: React.FC<{
    initialActivePowerDataPast: number[];
    initialActivePowerDataFuture: number[];
}> = ({ initialActivePowerDataPast, initialActivePowerDataFuture }) => {
    const [activePowerAvgDataPast, setActivePowerAvgDataPast] = useState<number[] | null>(initialActivePowerDataPast);
    const [activePowerAvgDataFuture, setActivePowerAvgDataFuture] = useState<number[] | null>(initialActivePowerDataFuture);
    const [xAxisData, setXAxisData] = useState<number[] | undefined>();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const activePowerDataPast = await getActivePowerAvgDataPast();
                const activePowerDataFuture = await getActivePowerAvgDataFuture();

                if (activePowerDataPast.length === 96 && activePowerDataFuture.length === 12) {
                    setXAxisData(prev => prev || Array.from({ length: 108 }, (_, index) => index + 1));
                    setActivePowerAvgDataPast(activePowerDataPast);
                    setActivePowerAvgDataFuture(activePowerDataFuture);
                    console.log(activePowerAvgDataPast);
                }
            } catch (error) {
                console.error("Error in fetchData: ", error);
                alert("Error fetching data. Please check the console for more details."); // User alert
            }
        };

        fetchData();
    }, []);

    const computeFutureSum = () => {
        if (!activePowerAvgDataFuture || activePowerAvgDataFuture.length === 0) return null;
        const total = activePowerAvgDataFuture.reduce((acc, value) => acc + Math.max(0, value), 0);
        return total.toFixed(2);
    };

    const futureSum = computeFutureSum();

    const data = {
        labels: xAxisData,
        datasets: [
            {
                label: 'Active Power avg for last 2 days',
                data: activePowerAvgDataPast,
                fill: false,
                borderColor: 'blue',
            },
            {
                label: 'Active Power Avg for next 6 hours',
                data: [
                    ...(activePowerAvgDataPast || []).map(() => null),
                    ...(activePowerAvgDataFuture || []),
                ],
                fill: false,
                borderColor: 'red',
            }
        ]
    };


    const options = {
        scales: {
            x: {
                type: 'linear' as const,
            },
            y: {
                type: 'linear' as const,
            },
        },
    };

    return (
        <Container maxWidth="md">
            <div >
                <h1>Dashboard</h1>

                <Line data={data} options={options} width={800} height={400} />

            </div>
            <div style={{ marginLeft: '20px' }}>
                <h2>Total Energy production in 6 hours</h2>
                <p>{futureSum} kW </p>
            </div>
        </Container>
    );
}




export default Dashboard;


export const getServerSideProps = async () => {
    try {
        const initialActivePowerDataPast = await getActivePowerAvgDataPast();
        const initialActivePowerDataFuture = await getActivePowerAvgDataFuture();

        return {
            props: {
                initialActivePowerDataPast,
                initialActivePowerDataFuture
            }
        };
    } catch (error) {
        console.error("Error fetching data:", error);
        return {
            props: {
                initialActivePowerDataPast: [],
                initialActivePowerDataFuture: []
            }
        };
    }
};